import { ProviderModelConfig } from './promptRunnerInterface';



export enum ModelType {
    // No Reasoning Models
    DEEPSEEK_V3 = 'DEEPSEEK_V3_LOW',
    GEMINI_FLASH = 'GEMINI_FLASH_LOW',
    LLAMA_4_MAVERICK = 'LLAMA_4_MAVERICK_LOW',
  
    // Reasoning Models (Medium to High)
    DEEPSEEK_R1_QWEN_MEDIUM = 'DEEPSEEK_R1_QWEN_MEDIUM',
    GPT_5_NANO_MEDIUM = 'GPT_5_NANO_MEDIUM',
    GPT_5_MINI_MEDIUM = 'GPT_5_MINI_MEDIUM',
    MISTRAL_SMALL_MEDIUM = 'MISTRAL_SMALL_MEDIUM',
    GPT_OSS_20B_HIGH = 'GPT_OSS_20B_HIGH',
    GPT_OSS_120B_HIGH = 'GPT_OSS_120B_HIGH',
  } 
  
  
  
  // No Reasoning Models - Fast, cost-effective models for simple tasks
  const NO_REASONING_MODELS: Partial<Record<ModelType, ProviderModelConfig>> = {
    [ModelType.DEEPSEEK_V3]: {
      modelName: "deepseek/deepseek-chat-v3.1",
    },
    [ModelType.GEMINI_FLASH]: {
      modelName: "google/gemini-2.0-flash-lite-001",
      notes: "recommended for cheap runs, smart, quick, and reliable."
    },
    [ModelType.LLAMA_4_MAVERICK]: {
      modelName: "meta-llama/llama-4-maverick",
      notes: "recommended for cheap but more intelligence, without reasoning."
    }
  };
  
  // Reasoning Models - Medium to high analytical capabilities for complex tasks
  const REASONING_MODELS: Partial<Record<ModelType, ProviderModelConfig>> = {
    [ModelType.DEEPSEEK_R1_QWEN_MEDIUM]: {
      modelName: "deepseek/deepseek-r1-0528-qwen3-8b",
      reasoningEnabled: true,
      reasoningEffort: "medium"
    },
    [ModelType.GPT_5_NANO_MEDIUM]: {
      modelName: "openai/gpt-5-nano",
      reasoningEnabled: true,
      reasoningEffort: "medium"
    },
    [ModelType.GPT_5_MINI_MEDIUM]: {
      modelName: "openai/gpt-5-mini",
      reasoningEnabled: true,
      reasoningEffort: "medium"
    },
    [ModelType.MISTRAL_SMALL_MEDIUM]: {
      modelName: "mistralai/mistral-small-3.2-24b-instruct",
      reasoningEnabled: true,
      reasoningEffort: "medium"
    },
    [ModelType.GPT_OSS_20B_HIGH]: {
      modelName: "openai/gpt-oss-20b",
      reasoningEnabled: true,
      reasoningEffort: "high",
      notes: "Recommended for cheap and smart with reasoning."
    },
    [ModelType.GPT_OSS_120B_HIGH]: {
      modelName: "openai/gpt-oss-120b",
      reasoningEnabled: true,
      reasoningEffort: "high",
      notes: "Smartest recommendation, with reasoning. Still cost effective."
    }
  };
  
  // Aggregate MODEL_CONFIGS combining all model categories
  export const MODEL_CONFIGS: Record<ModelType, ProviderModelConfig> = {
    ...NO_REASONING_MODELS,
    ...REASONING_MODELS
  } as Record<ModelType, ProviderModelConfig>;
  
  export const DEFAULT_MODEL_TYPE: ModelType = ModelType.GEMINI_FLASH;
