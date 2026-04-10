from google import genai
from covai.models import AnalysisPrompt

class LLMModel:

    def __init__(self, name: str, api_key: str):
        self.name = name
        self.client = genai.Client(api_key=api_key)
    
    def generate(self, content):
        response = self.client.models.generate_content(
            model=self.name,
            contents=content
        )
        return response

class Agent:

    def __init__(self, model: LLMModel):
        self.model = model


    def generate_tests(self, prompt: AnalysisPrompt):
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

        response = self.model.generate(messages)
        return response.text

