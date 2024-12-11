import { readFile } from 'fs/promises';
import { load } from 'js-yaml';
import { Agent } from './base-agent';
import { LLMProvider } from '../types';
import { AgentTool } from './agent-types';

export class AgentLoader {
  async loadFromYaml(path: string, provider: LLMProvider): Promise<Agent> {
    const content = await readFile(path, 'utf-8');
    const config = load(content) as any;

    // Map tools from YAML to AgentTool instances
    const tools: AgentTool[] = (config.tools || []).map((toolConfig: any) => {
      // Import tool implementation from tools directory
      const toolModule = require(`./tools/${toolConfig.type}`);
      const ToolClass = toolModule.default || toolModule[toolConfig.type];
      return new ToolClass(toolConfig.parameters);
    });

    return new Agent({
      role: config.name,
      goal: config.description,
      backstory: config.description,
      llmOptions: {
        ...config.model.parameters,
        model: config.model.name,
        systemMessage: this.processSystemPrompt(
          config.system_prompt,
          config.role,
          config.goal,
          config.backstory
        ),
        streaming: true
      },
      tools: tools
    }, provider);
  }

  private processSystemPrompt(
    template: string,
    role: string,
    goal: string,
    backstory: string
  ): string {
    return template
      .replace('{role}', role)
      .replace('{goal}', goal)
      .replace('{backstory}', backstory);
  }
}