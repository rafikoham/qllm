import { AgentLoader } from '../agent-loader';
import { OpenAIProvider } from '../../providers/openai';
import { LlamaAgent } from './llama-agent';
import path from 'path';

async function testLlamaAgent() {
    try {
        // Initialize OpenAI provider
        const provider = new OpenAIProvider();

        // Create a direct instance of LlamaAgent for testing
        const llamaAgent = new LlamaAgent({
            filePath: "./documents/sample.pdf",
            resultType: "markdown"
        });

        // Initialize and test direct usage
        await llamaAgent.initialize();
        const result = await llamaAgent.execute({
            query: "What is the main topic of this document?"
        });

        console.log("Direct LlamaAgent Result:", result);

        // Test through agent configuration
        const loader = new AgentLoader();
        const yamlPath = path.resolve(__dirname, "config.yaml");
        console.log('Loading agent from:', yamlPath);
        
        const agent = await loader.loadFromYaml(yamlPath, provider);
        console.log('Agent loaded successfully!');

        // Test the agent with a query
        console.log('\nTesting agent with a query...');
        const response = await agent.chat('Can you analyze this document and tell me its key points?');
        console.log('\nAgent response:', response);

    } catch (error) {
        console.error('Error:', error);
    }
}

// Run the test
testLlamaAgent();
