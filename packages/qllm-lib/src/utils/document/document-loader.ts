// packages/qllm-lib/src/utils/document/document-loader.ts

import fs from 'fs/promises';
import path from 'path';
import axios, { AxiosRequestConfig, CancelTokenSource } from 'axios';
import { EventEmitter } from 'events';
import os from 'os';
import zlib from 'zlib';
import { promisify } from 'util';
import mime from 'mime-types';
import { URL } from 'url';
import { createHash } from 'crypto'; // New import statement
import { getHandlerForMimeType } from './format-handlers';
import logger from '../logger';
import { DocumentParser, LoadResult } from '../../types/document-types';
import { ParserRegistry, DefaultParserRegistry } from './parsers/parser-registry';
import { ContentValidator,ContentValidationOptions } from './content-validator';



const gunzip = promisify(zlib.gunzip);


export interface DocumentLoaderOptions {
  chunkSize?: number;
  encoding?: BufferEncoding;
  timeout?: number;
  headers?: Record<string, string>;
  maxRetries?: number;
  retryDelay?: number;
  cacheDir?: string;
  proxy?: string; // Should be in the format "host:port"
  decompress?: boolean;
  useCache?: boolean;
  maxFileSize?: number;
  validationOptions?: ContentValidationOptions;
}


export interface DocumentLoaderEvents {
  progress: (progress: number) => void;
  loaded: (result: LoadResult<Buffer>) => void;
  error: (error: Error) => void;
  retry: (attempt: number, maxRetries: number) => void;
}

export class DocumentLoader extends EventEmitter {
  private inputPath: string;
  private options: Required<DocumentLoaderOptions>;
  private cancelTokenSource: CancelTokenSource | null = null;
  private contentValidator: ContentValidator;

  constructor(inputPath: string, 
    private parserRegistry: ParserRegistry = new DefaultParserRegistry(),
    options: DocumentLoaderOptions = {}) {

    super();
    // Validate input path immediately
    this.validateFilePath(inputPath);
    this.inputPath = inputPath;

    this.options = {
        chunkSize: 1024 * 1024,
        encoding: 'utf-8',
        timeout: 30000, // 30 seconds
        headers: {},
        maxRetries: 3,
        retryDelay: 1000,
        cacheDir: path.join(os.tmpdir(), 'document-loader-cache'),
        proxy: '',
        decompress: true,
        useCache: false,
        maxFileSize: 100 * 1024 * 1024, // 100MB
        validationOptions: {
          maxFileSize: 100 * 1024 * 1024,
          allowedMimeTypes: ['text/plain', 'application/pdf', 'text/typescript','application/octet-stream','application/pdf'],
          validateEncoding: true,
          securityScanEnabled: true
      },
        ...options,
    };

    this.contentValidator = new ContentValidator(this.options.validationOptions);

  }

  private expandTilde(filePath: string): string {
    if (filePath.startsWith('~/') || filePath === '~') {
      return filePath.replace('~', os.homedir());
    }
    return filePath;
  }

  private isUrl(input: string): boolean {
    return input.startsWith('http://') || input.startsWith('https://');
  }

  private isFileUrl(input: string): boolean {
    return input.startsWith('file://');
  }

  private fileUrlToPath(fileUrl: string): string {
    const url = new URL(fileUrl);
    return decodeURIComponent(url.pathname);
  }

  private validateFilePath(filePath: string): void {
    if (typeof filePath !== 'string') {
        throw new Error('File path must be a string');
    }

    // Basic security check to prevent directory traversal
    const normalizedPath = path.normalize(filePath);
    if (normalizedPath.includes('..')) {
        throw new Error('File path cannot contain parent directory references');
    }

    // Check for suspicious characters
    const suspiciousChars = /[\0<>:"|?*]/;
    if (suspiciousChars.test(filePath)) {
        throw new Error('File path contains invalid characters');
    }

    // Check path length
    if (filePath.length > 255) {
        throw new Error('File path exceeds maximum length');
    }
}


  private getParser(filename: string): DocumentParser | undefined {
    return this.parserRegistry.getParser(filename);
}

  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    // Override MIME type for TypeScript files
    if (ext === '.ts' || ext === '.tsx') {
        return 'text/typescript';
    }
    return mime.lookup(filePath) || 'application/octet-stream';
}


private async loadFromFile(filePath: string): Promise<LoadResult<Buffer>> {
  try {
      // Initial path processing
      const expandedPath = this.expandTilde(filePath);
      const absolutePath = path.resolve(expandedPath);
      const mimeType = this.getMimeType(absolutePath) || 'application/octet-stream';

      // Validate file existence and accessibility
      try {
          await fs.access(absolutePath, fs.constants.R_OK);
      } catch (error) {
          throw new Error(`File not accessible: ${filePath}`);
      }

      // Check cache if enabled
      if (this.options.useCache) {
          const cachedPath = this.getCachePath(absolutePath);
          if (await this.isCacheValid(absolutePath, cachedPath)) {
              try {
                  const content = await fs.readFile(cachedPath);
                  const parsedContent = await this.parseContent(content, absolutePath);
                  return { content, mimeType, parsedContent };
              } catch (error) {
                  // Cache read failed, continue with normal file loading
                  logger.warn(`Cache read failed for ${filePath}, loading from source`);
              }
          }
      }

      // Get file stats and validate size
      const fileStats = await fs.stat(absolutePath);
      if (fileStats.size > this.options.maxFileSize) {
          throw new Error(
              `File size (${fileStats.size} bytes) exceeds maximum allowed size (${this.options.maxFileSize} bytes)`
          );
      }

      // Load file in chunks with proper resource management
      let fileHandle: fs.FileHandle | undefined;
      try {
          fileHandle = await fs.open(absolutePath, 'r');
          const totalSize = fileStats.size;
          let loadedSize = 0;
          const chunks: Buffer[] = [];

          // Read file in chunks
          while (loadedSize < totalSize) {
              const buffer = Buffer.alloc(Math.min(this.options.chunkSize, totalSize - loadedSize));
              const result = await fileHandle.read(buffer, 0, buffer.length, loadedSize);
              
              if (result.bytesRead <= 0) {
                  break; // End of file or error
              }

              chunks.push(buffer.subarray(0, result.bytesRead));
              loadedSize += result.bytesRead;
              
              // Emit progress
              this.emit('progress', loadedSize / totalSize);

              // Check if operation was cancelled
              if (this.cancelTokenSource?.token.reason) {
                  throw new Error('Operation cancelled by user');
              }
          }

          const content = Buffer.concat(chunks);

          // Validate content size after reading
          if (content.length !== totalSize) {
              throw new Error(`File size mismatch: expected ${totalSize}, got ${content.length}`);
          }

          // Cache content if enabled
          if (this.options.useCache) {
              try {
                  const cachedPath = this.getCachePath(absolutePath);
                  await this.cacheContent(cachedPath, content);
              } catch (error) {
                  // Log cache write failure but continue
                  logger.error(`Failed to cache content for ${filePath}: ${error}`);
              }
          }

          // Parse content using appropriate parser
          const parsedContent = await this.parseContent(content, absolutePath);

          return { content, mimeType, parsedContent };

      } finally {
          // Ensure file handle is always closed
          if (fileHandle) {
              await fileHandle.close().catch(error => {
                  logger.error(`Failed to close file handle for ${filePath}: ${error}`);
              });
          }
      }

  } catch (error) {
      // Transform and rethrow errors with context
      const errorMessage = error instanceof Error ? 
          error.message : 
          `Unknown error: ${String(error)}`;
      
      throw new Error(`Failed to load file ${filePath}: ${errorMessage}`);
  }
}
  

  private async validateContent(buffer: Buffer, filePath: string): Promise<void> {
    try {
        const mimeType = this.getMimeType(filePath);
        await this.contentValidator.validateContent(buffer, mimeType, filePath);
    } catch (error) {
        const errorMessage = error instanceof Error ? 
            error.message : 
            `Content validation failed: ${String(error)}`;
        throw new Error(`Validation error for ${filePath}: ${errorMessage}`);
    }
}


private async parseContent(buffer: Buffer, filePath: string): Promise<string | undefined> {
    const parser = this.getParser(filePath);
    if (!parser) {
        return undefined;
    }

    try {
        await this.validateContent(buffer, this.getMimeType(filePath));
        return await parser.parse(buffer, filePath);
    } catch (error) {
        this.emit('error', new Error(`Parsing error for ${filePath}: ${error}`));
        throw error;
    }
}

//   public async load(filePath: string): Promise<string> {
//     try {
//       const result = await this.loadFromFile(filePath);
//       if (!result.parsedContent) {
//         throw new Error(`No parser available for file: ${filePath}`);
//       }
//       return result.parsedContent;
//     } catch (error) {
//       throw new Error(`Failed to load document: ${error}`);
//     }
//   }

  private async loadFromUrl(url: string): Promise<LoadResult<Buffer>> {
    if (this.options.useCache) {
      const cachedPath = this.getCachePath(url);
      if (await this.isCacheValid(url, cachedPath)) {
        const content = await fs.readFile(cachedPath);
        const mimeType = mime.lookup(url) || 'application/octet-stream';
        return { content, mimeType };
      }
    }

    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        this.cancelTokenSource = axios.CancelToken.source();
        const axiosConfig: AxiosRequestConfig = {
          responseType: 'arraybuffer',
          timeout: this.options.timeout,
          headers: this.options.headers,
          onDownloadProgress: (progressEvent) => {
            if (progressEvent.total) {
              this.emit('progress', progressEvent.loaded / progressEvent.total);
            }
          },
          cancelToken: this.cancelTokenSource.token,
          proxy: this.options.proxy
            ? {
                host: this.options.proxy.split(':')[0],
                port: parseInt(this.options.proxy.split(':')[1], 10),
              }
            : undefined,
        };

        const response = await axios.get(url, axiosConfig);
        let content = Buffer.from(response.data);

        if (this.options.decompress && response.headers['content-encoding'] === 'gzip') {
          content = await gunzip(content);
        }

        const mimeType = response.headers['content-type'] || 'application/octet-stream';

        if (this.options.useCache) {
          const cachedPath = this.getCachePath(url);
          await this.cacheContent(cachedPath, content);
        }

        return { content, mimeType };
      } catch (error) {
        if (axios.isCancel(error)) {
          throw new Error('Operation cancelled');
        }
        if (attempt === this.options.maxRetries) {
          throw error;
        }
        this.emit('retry', attempt, this.options.maxRetries);
        await new Promise((resolve) => setTimeout(resolve, this.options.retryDelay));
      }
    }
    throw new Error('Max retries reached');
  }

  private getCachePath(key: string): string {
    const hash = createHash('md5').update(key).digest('hex'); // Updated to use import
    return path.join(this.options.cacheDir, hash);
  }

  private async isCacheValid(original: string, cached: string): Promise<boolean> {
    try {
      const [originalStat, cachedStat] = await Promise.all([fs.stat(original), fs.stat(cached)]);
      return cachedStat.mtime > originalStat.mtime;
    } catch {
      return false;
    }
  }

  private async cacheContent(cachedPath: string, content: Buffer): Promise<void> {
    await fs.mkdir(path.dirname(cachedPath), { recursive: true });
    await fs.writeFile(cachedPath, content);
  }

  public async loadAsString(): Promise<LoadResult<string>> {
    const { content: buffer, mimeType } = await this.loadAsBuffer();
    try {
      const handler = getHandlerForMimeType(mimeType);
      let content: string;
      
      if (handler) {
        content = await handler.handle(buffer);
      } else {
        // Fallback to basic text conversion
        logger.warn(`No handler found for mime type ${mimeType}, falling back to basic text conversion`);
        content = buffer.toString(this.options.encoding);
      }
  
      // Add parsing step
      const parsedContent = await this.parseContent(buffer, this.inputPath);
  
      return {
        content,
        mimeType,
        parsedContent
      };
    } catch (error) {
      throw new Error(
        `Failed to process file (${mimeType}): ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  public async loadAsBuffer(): Promise<LoadResult<Buffer>> {
    try {
      let result: LoadResult<Buffer>;
      
      if (this.isUrl(this.inputPath)) {
        result = await this.loadFromUrl(this.inputPath);
      } else if (this.isFileUrl(this.inputPath)) {
        const filePath = this.fileUrlToPath(this.inputPath);
        result = await this.loadFromFile(filePath);
      } else {
        result = await this.loadFromFile(this.inputPath);
      }
  
      // Add parsing step
      const parsedContent = await this.parseContent(result.content, this.inputPath);
      result.parsedContent = parsedContent;
  
      this.emit('loaded', result);
      return result;
    } catch (error) {
      const typedError = error instanceof Error ? error : new Error(String(error));
      this.emit('error', typedError);
      throw typedError;
    }
  }

  public cancel(): void {
    if (this.cancelTokenSource) {
      this.cancelTokenSource.cancel('Operation cancelled by user');
    }
  }

  public static async quickLoadString(
    input: string,
    options?: DocumentLoaderOptions,
  ): Promise<LoadResult<string>> {
    
    const defaultRegistry = new DefaultParserRegistry();
    const loader = new DocumentLoader(input, defaultRegistry,options);
    return loader.loadAsString();
  }

  public static async quickLoadBuffer(
    input: string,
    options?: DocumentLoaderOptions,
  ): Promise<LoadResult<Buffer>> {
    const defaultRegistry = new DefaultParserRegistry();
    const loader = new DocumentLoader(input, defaultRegistry,options);
    return loader.loadAsBuffer();
  }

  public static async loadMultipleAsString(
    inputs: string[],
    options?: DocumentLoaderOptions,
  ): Promise<LoadResult<string>[]> {
    const defaultRegistry = new DefaultParserRegistry();
    const loaders = inputs.map((input) => new DocumentLoader(input,defaultRegistry, options));
    return Promise.all(loaders.map((loader) => loader.loadAsString()));
  }

  public static async loadMultipleAsBuffer(
    inputs: string[],
    options?: DocumentLoaderOptions,
  ): Promise<LoadResult<Buffer>[]> {
    const defaultRegistry = new DefaultParserRegistry();
    const loaders = inputs.map((input) => new DocumentLoader(input,defaultRegistry, options));
    return Promise.all(loaders.map((loader) => loader.loadAsBuffer()));
  }

  // Type-safe event emitter methods
  public on<K extends keyof DocumentLoaderEvents>(
    event: K,
    listener: DocumentLoaderEvents[K],
  ): this {
    return super.on(event, listener);
  }

  public emit<K extends keyof DocumentLoaderEvents>(
    event: K,
    ...args: Parameters<DocumentLoaderEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }
  
}