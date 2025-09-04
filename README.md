# Rapid LLM Prototyping (TypeScript)

Batteries-included patterns for **fast LLM prototyping** and a clean path to **production-ready** structure using **Typescript**. Built around **Zod** (typed I/O), **OpenRouter** (model choice), and **Vercel AI SDK** (providers/tools).


## As a project

It provides a zero-config yarn script runner and two core patterns—Prompt Tasks and Agents—for quick, typed experimentation. These light weight abstractions set sensible defaults to help with quick iteraction.

The architecture stays small and composable so you can swap models, add tools, and scale the same codebase when you’re ready. It also keeps the code lightweight and extendable so experiments can grow into production without major rewrites.

## As a reference

It's a small but good start to a **pattern catalog** that are transferable to other libraries/stacks as well - even without running it.

### Check out

* `src/llmServices/basePromptTaskService.ts` - **Prompt Task** pattern (single-prompt, Zod-validated I/O).
* `src/llmServices/baseAgentService.ts` - **Agent** pattern (multi-turn, tools, explicit termination).
* `src/llmServices/models.ts` - **curated, cost-sane models** and the single swap point.
* `src/services/llmProviders/openRouterPromptRunner.ts` - sensible defaults, boilerplate for agents and prompt tasks
* `.cursorrules` — IDE templates/rules to **one-shot** new Tasks/Scripts consistently.

### Portable patterns (any stack)

* **Task vs Agent** split: keep simple generations as tasks; use agents for tools/multi-step flows.
* **Typed boundaries**: validate LLM outputs at the edge (Zod or your schema lib); repair or reject upfront.
* **Provider abstraction**: a small runner/interface so model/provider changes don’t touch business logic.
* **Fast iteration**: “one shot a script, run it” workflow (`yarn script <name>`) to shorten feedback loops.
* **Guardrails & cost**: explicit termination to avoid loops; start with cheap defaults, escalate to reasoning only when needed.


## Who this is for — and what you’ll get

* **Audience:** Mid-Staff level engineers expirmenting with LLM agents/workflows, or those exploring patterns for rapid (yet production grade) implementations.
* **You get:**
  * Two core patterns: **Prompt Tasks** (single-shot, typed) and **Agents** (multi-step, tools).
  * A **curated model shortlist** that’s cost-sane and “just works.”
  * Helpful DX: **Cursor rules**, scaffolds, and sensible abstractions. *Along with a reliable and modern yarn and ts setup.*
  * `yarn script <name>`: zero-config script runner util for quick experiments.

---

## Prereqs

* **Node** ≥ 20, **Yarn** installed.
* **OpenRouter API key** in your environment.

Create `.env` at repo root:

```bash
OPENROUTER_API_KEY=your_key_here
```

---

## Install & first run 

```bash
yarn install
cp .env.example .env  # add your open router api key
yarn script verifyConnection
```

You should see a success/diagnostic message confirming API connectivity, along with your current api rate limit information.

---

## Run your first agent

```bash
yarn script example-workflow
```

This runs a simple, interactive LLM workflow using the framework's **Prompt Task** pattern.

```bash
yarn script example-agent
```

This runs an interactive agent demo (bread-recipe use case) using the framework’s **Agent** pattern.

---

## What scripts can I run?

All scripts live in `src/scripts` and run as `yarn script <filename-without-ext>`.


### Setup
* `verifyConnection` — sanity check your OpenRouter key and connectivity.

### Dev Support
* `testModels` — quick, structured checks of curated model list (`--all`, `--model <ModelType>`, `--attempts`, `--save`, `--help`).

### Examples

* `example-agent` — interactive **Agent** pattern with tools and user prompts.
* `example-workflow` — orchestrates multiple services end-to-end; supports args like `--theme` and `--save`.
* `example-agent-unabstracted` — the same agent built **without** abstractions (educational comparison).

> Tip: keep your own experiments in `src/scripts/`—no `package.json` edits needed.

---

## Core concepts 

### Prompt Tasks (single-shot, typed I/O)

Use when you want one-and-done generation/extraction with **Zod**-validated structure. Abstracted to help cursor/ai agent quickly and easily one-shot a new prompt task being created with a schema validated result.

```ts
// src/llmServices/tasks/MyTask.ts (sketch)
import { z } from "zod";
import { BasePromptTaskService } from "../basePromptTaskService";

const Output = z.object({ title: z.string(), bullets: z.array(z.string()) });

export class MyTask extends BasePromptTaskService<typeof Output> {
  schema = Output;
  buildMessages(input: { topic: string }) {
    return [{ role: "user", content: `Summarize: ${input.topic}` }];
  }
  ...
}
```

### Agents (multi-step with tools)

Use when you need interaction, tool calls, and controlled termination.

```ts
// src/llmServices/agents/MyAgent.ts (sketch)
import { BaseAgentService } from "../baseAgentService";

export class MyAgent extends BaseAgentService {
  systemPrompt = "You are a helpful LLM prototype agent.";
  tools = [/* action & ask-user tools */];
  // Agent loop manages tool invocations and returns a final result.
  
  ...
}
```

---

## Choosing a model (practical defaults)

Models are defined in `src/llmServices/models.ts`. Start with one of these:

* **Default (fast/cheap):** `ModelType.GEMINI_FLASH`
  `google/gemini-2.0-flash-lite-001` — quick, reliable, cost-efficient.

* **Balanced (smarter, no reasoning):** `ModelType.LLAMA_4_MAVERICK`
  `meta-llama/llama-4-maverick` — more intelligence without reasoning overhead.

* **Reasoning for more horsepower (use sparingly):** `ModelType.GPT_OSS_120B_HIGH`
  `openai/gpt-oss-120b` — Great balance of cost and intelligence with reasoning.
  *(On a tighter budget for reasoning? Try `ModelType.GPT_OSS_20B_HIGH`.)*

*(Or add a new one from OpenRouter's model list)*

### Useful resources for choosing models
* **[Model Comparison/choosing a new model](https://artificialanalysis.ai/models)** — Comprehensive model analysis with intelligence, performance, and price comparisons
* **[Open Router Available Models](https://openrouter.ai/models)** — Complete list of all models available through OpenRouter API

**Switching models (example)**


```ts
// Wherever you construct your runner/service
import { OpenRouterPromptRunner } from "./openRouterPromptRunner";
import { ModelType } from "./models";

const runner = new OpenRouterPromptRunner(ModelType.GEMINI_FLASH, 0.7);
// pass runner into your Task/Agent or set as a default in your base class config
```

---

## Development experience: Cursor rules

The repo includes a `.cursorrules` tuned for this project:

* One-shot scaffolds for new Tasks/Agents/Scripts.
* Consistent prompts and file templates.
* Faster iteration with fewer foot-guns.

### Example
try the following prompt in cursor or claude code

```text
Create a new llm task and script to call it that:
	1. Asks the user for a list of ingredients they have available
	2. Calls a prompt that asks the llm to generate a dinner recipe that contains those ingredience
	3. saves the recipe in a json file 
```

---

## Extend this repo
* **New Prompt Task:** copy an existing Task, change the **Zod** schema + prompts.
* **New Agent:** copy an Agent, define **tools** and a clear **termination** condition.
* **New script:** drop a `*.ts` into `src/scripts` and run with `yarn script <name>`.
* Utilities: `AsyncRateLimiter` for production ready + heavy parallelized tasks

## Moving from prototyping to more productization

This project is set up for easy integration with more product-focused additions for additional features and to move from the prototyping stage. 

The following are tested with this quickstart app and particularly recommended to be included as appropriate. 
* docker with node server
* github cicd
* supabase (with or without pgvector)
* qdrant vector db
* firecrawl
* bullmq/io redis
* mastra ai
* vercel ai skd ui

*Note: These were all stripped out to keep it simple and single purposed. Let me know if you'd like the config, examples for any of these.*

It's a monorepo set up, so you can add new projects/workspaces to it.

TODO:
* An Open Telemetry observability platform/strategy

---

## Why This Design?

This framework makes specific architectural choices to balance ease of use with production readiness:

### Dual Pattern Approach
**Prompt Tasks** (single-prompt, typed) vs **Agents** (multi-step, tools) serve different use cases:
- **Tasks** for focused operations like data extraction, content generation
- **Agents** for interactive workflows requiring tool calls and conversation state

### Cost-Conscious Model Selection
Models are pre-selected for reliability and cost-effectiveness:
- **Fast/Efficient:** Gemini Flash for quick, reliable responses
- **Balanced:** Llama 4 Maverick for more intelligence without reasoning overhead
- **High-Capability:** GPT-OSS models when you need reasoning power

### Abstraction Layer Benefits
The framework hides some Vercel AI SDK complexity with sensible defaults to help rapid development while still enabling customization:
- **Less boilerplate** for common LLM operations
- **Consistent patterns** across all services
- **Type safety** from input to output
- **Easy testing** with dependency injection

### Sensible Defaults
The `OpenRouterPromptRunner` abstracts away common configuration complexity with carefully chosen defaults:
- **Model Selection & Generation Parameters**: Preconfigured setup for cost-effective models in OpenRouter, with balanced temperature settings, removing less usedsettings for most purposes.
- **Error Handling & Resilience**: Includes automatic retry logic for parsing failures, timeout protection, and graceful error recovery to ensure reliable operation without manual intervention
- **Provider Configuration**: Handles OpenRouter API setup, tool call edge case fixes, and optional debug logging, keeping the core business logic clean and focused

---

## Why These Libraries?

The framework builds on libraries chosen for specific strengths:

### Zod (Schema Validation)
- **Runtime validation** + **TypeScript types** = bulletproof I/O
- Ensures LLM responses match expected structure
- Compile-time type safety with runtime guarantees
- Essential for reliable structured generation

### OpenRouter (Model Provider)
- **One API for 100+ models** from different providers
- Smart **cost optimization** across model landscape
- Unified interface regardless of underlying provider
- Easy model switching and comparison

### Vercel AI SDK (Foundation)
- **Battle-tested foundation** with tool calling support
- Handles complex agent workflows and multi-turn conversations
- Robust error handling and retry logic
- Provider-agnostic design for future flexibility

---

## Advanced Patterns & Tool Design

### Three-Tool Architecture for Agents

Agents use three types of tools for different interaction patterns:

#### 1. Action Tools (Execute Operations)
```typescript
const searchTool = tool({
  description: 'Search for information',
  inputSchema: z.object({
    query: z.string(),
    category: z.enum(['web', 'database'])
  }),
  execute: async ({ query, category }) => {
    // Perform search operation
    return searchResults;
  }
});
```

#### 2. User Interaction Tools (Gather Input)
```typescript
const requestInputTool = tool({
  description: 'Request user preferences',
  inputSchema: z.object({
    question: z.string(),
    context: z.string()
  }),
  execute: async ({ question, context }) => {
    // Collect user input interactively
    return userResponse;
  }
});
```

#### 3. Termination Tools (End Agent)
```typescript
const answerTool = tool({
  description: 'Provide final result',
  inputSchema: z.object({
    title: z.string(),
    content: z.string(),
    confidence: z.number()
  })
  // No execute function - terminates agent
});
```


