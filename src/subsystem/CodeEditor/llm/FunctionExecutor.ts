export interface FunctionCall {
    name: string;
    params: Record<string, any>;
}
export interface FunctionExecutionResult {
    name: string;
    success: boolean;
    data?: any;
    error?: string;
}
/**
 * Function definition.
 */
export interface FunctionDefinition {
    name: string;
    handler: (params: Record<string, any>) => Promise<any>;
    description?: string;
}
/**
 * Registry of available functions.
 */
const functionRegistry: Map<string, FunctionDefinition> = new Map();
/**
 * Register a function that can be called by the LLM.
 */
export function registerFunction(definition: FunctionDefinition): void {
    if (functionRegistry.has(definition.name)) {
        console.warn(`[CodeEditor FunctionExecutor] Function "${definition.name}" is already registered, overwriting.`);
    }
    functionRegistry.set(definition.name, definition);
    console.log(`[CodeEditor FunctionExecutor] Registered function: ${definition.name}`);
}
/**
 * Check if a function is registered.
 */
export function isFunctionRegistered(name: string): boolean {
    return functionRegistry.has(name);
}
/**
 * Get all registered function names.
 */
export function getRegisteredFunctionNames(): string[] {
    return Array.from(functionRegistry.keys());
}
/**
 * Execute a single function call.
 */
export async function executeFunctionCall(call: FunctionCall): Promise<FunctionExecutionResult> {
    const { name, params } = call;
    console.log(`[CodeEditor FunctionExecutor] Executing: ${name}`, params);
    const definition = functionRegistry.get(name);
    if (!definition) {
        const error = `Unknown function: ${name}. Available: ${getRegisteredFunctionNames().join(", ")}`;
        console.error(`[CodeEditor FunctionExecutor] ${error}`);
        return { name, success: false, error };
    }
    try {
        const result = await definition.handler(params);
        console.log(`[CodeEditor FunctionExecutor] Success: ${name}`, result);
        return { name, success: true, data: result };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[CodeEditor FunctionExecutor] Failed: ${name}`, errorMessage);
        return { name, success: false, error: errorMessage };
    }
}
/**
 * Resolve `${step_N.field}` placeholders in the params object.
 */
function resolveReferences(params: any, results: FunctionExecutionResult[]): any {
    // Handle string placeholders like "${step_0.material_id}"
    if (typeof params === "string") {
        const match = params.match(/^\$\{step_(\d+)\.([A-Za-z0-9_]+)\}$/);
        if (match) {
            const stepIndex = parseInt(match[1], 10);
            const field = match[2];
            const previousResult = results[stepIndex];
            if (!previousResult) {
                throw new Error(`Placeholder \${step_${stepIndex}.${field}} references a command that has not executed yet.`);
            }
            if (!previousResult.success) {
                throw new Error(`Placeholder \${step_${stepIndex}.${field}} references a failed command (${previousResult.name}).`);
            }
            const value = previousResult.data?.[field];
            if (value === undefined || value === null) {
                throw new Error(`Placeholder \${step_${stepIndex}.${field}} could not be resolved: field "${field}" not found in result of command ${stepIndex} (${previousResult.name}).`);
            }
            return value;
        }
        return params;
    }
    if (Array.isArray(params)) {
        return params.map((item) => resolveReferences(item, results));
    }
    if (typeof params === "object" && params !== null) {
        const resolved: Record<string, any> = {};
        for (const key of Object.keys(params)) {
            resolved[key] = resolveReferences(params[key], results);
        }
        return resolved;
    }
    return params;
}
/**
 * Execute multiple function calls in order.
 */
export async function executeFunctionCalls(calls: FunctionCall[]): Promise<FunctionExecutionResult[]> {
    if (!calls || calls.length === 0) {
        return [];
    }
    console.log(`[CodeEditor FunctionExecutor] Executing ${calls.length} function calls...`);
    const results: FunctionExecutionResult[] = [];
    for (const call of calls) {
        // Resolve ${step_N.field} placeholders based on previous results
        let resolvedParams: Record<string, any>;
        try {
            resolvedParams = resolveReferences(call.params, results);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[CodeEditor FunctionExecutor] Failed to resolve references for ${call.name}:`, errorMessage);
            results.push({ name: call.name, success: false, error: errorMessage });
            continue;
        }
        const resolvedCall: FunctionCall = { name: call.name, params: resolvedParams };
        const result = await executeFunctionCall(resolvedCall);
        results.push(result);
        // Continue execution even if a function fails (log the error and continue)
        if (!result.success) {
            console.warn(`[CodeEditor FunctionExecutor] Function ${call.name} failed, continuing with remaining functions.`);
        }
    }
    console.log(`[CodeEditor FunctionExecutor] Execution complete. Success: ${results.filter((r) => r.success).length}, Failed: ${results.filter((r) => !r.success).length}`);
    return results;
}
/**
 * Process a parsed LLM response and execute any function calls found in `terminalResponse.commands`.
 */
export async function processLLMResponse(llmResponse: {
    terminalResponse?: {
        functionCalls?: FunctionCall[];
        [key: string]: any;
    } | null;
    chatResponse?: any;
}): Promise<FunctionExecutionResult[]> {
    if (!llmResponse?.terminalResponse?.functionCalls) {
        return [];
    }
    const calls = llmResponse.terminalResponse.functionCalls;
    if (!Array.isArray(calls) || calls.length === 0) {
        return [];
    }
    return await executeFunctionCalls(calls);
}