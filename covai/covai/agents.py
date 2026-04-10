from google import genai
from anthropic import Anthropic

from covai.models import AnalysisPrompt
from covai.config import SupportedClients
from covai.config import AIConfig

class LLMModel:

    def __init__(self, name: str, api_key: str):
        self.name = name
        self.api_key = api_key
    
    @staticmethod
    def create(ai_config: AIConfig):
        if ai_config.client == SupportedClients.GOOGLE:
            return GeminiModel(ai_config)
        elif ai_config.client == SupportedClients.CLAUDE:
            return ClaudeModel(ai_config)
        raise ValueError(f"Unsupported client: {ai_config.client}")

    def generate(self, prompt: AnalysisPrompt):
        raise NotImplementedError

class GeminiModel(LLMModel):

    def __init__(self, ai_config: AIConfig):
        super().__init__(ai_config.model, ai_config.api_key)
        self.client = genai.Client(api_key=ai_config.api_key)

    def generate(self, prompt: AnalysisPrompt):
        messages = [
            {
                "role": "user",
                "parts": [{"text": prompt.system_prompt}]
            },
            {
                "role": "user",
                "parts": [{"text": prompt.user_prompt}]
            },
        ]
        response = self.client.models.generate_content(
            model=self.name,
            contents=messages
        )
        return response.text

class ClaudeModel(LLMModel):

    def __init__(self, ai_config: AIConfig):
        super().__init__(ai_config.model, ai_config.api_key)
        self.client = Anthropic(api_key=ai_config.api_key)
        self.max_tokens = ai_config.max_tokens
    
    def generate(self, prompt: AnalysisPrompt):
        messages = [
            {
                "role": "user",
                "content": prompt.system_prompt
            },
            {
                "role": "user",
                "content": prompt.user_prompt
            },
            
        ]
        response = self.client.messages.create(
            model=self.name,
            max_tokens=self.max_tokens,
            messages=messages
        )

        return response.content[0].text
