import { AgentLoader } from 'qllm-lib';
import { OpenAIProvider } from 'qllm-lib';
import path from 'path';

async function testAgent() {
    try {
        // Initialize OpenAI provider (will automatically use OPENAI_API_KEY from env)
        const provider = new OpenAIProvider();

        // Create agent loader
        const loader = new AgentLoader();

        // Load agent from yaml using absolute path
        const yamlPath = "C:/Users/User/Desktop/qllm/packages/qllm-samples/data/default-agent.yaml";
        console.log('Loading agent from:', yamlPath);
        
        const agent = await loader.loadFromYaml(yamlPath, provider);
        console.log('Agent loaded successfully!');

        // Test the agent with a simple message
        console.log('\nTesting agent with a message...');
        const response = await agent.chat('Hello! Can you help me search for information about TypeScript?');
        console.log('\nAgent response:', response);

    } catch (error) {
        console.error('Error:', error);
    }
}

// Run the test
testAgent();
