export function validateTitle(title: string): boolean {
  return title.length > 0 && title.length <= 100;
}

export function validateStepId(stepId: string): boolean {
  return /^[a-zA-Z0-9-_]+$/.test(stepId);
}

export function validateNodeType(nodeType: string): boolean {
  const validTypes = ['action', 'decision', 'human', 'exception', 'terminal'];
  return validTypes.includes(nodeType);
}

export function validatePhase(phase: string): boolean {
  const validPhases = ['initiation', 'planning', 'execution', 'closure'];
  return validPhases.includes(phase);
}

export function validateOwner(owner: string): boolean {
  return owner.length > 0 && owner.length <= 50;
}

export function validateCriticality(criticality: string): boolean {
  const validCriticalities = ['low', 'medium', 'high'];
  return validCriticalities.includes(criticality);
}

export function validateInputs(inputs: string[]): boolean {
  return inputs.length > 0 && inputs.every(input => input.length > 0);
}

export function validateOutputs(outputs: string[]): boolean {
  return outputs.length > 0 && outputs.every(output => output.length > 0);
}

export function validateRules(rules: string): boolean {
  return rules.length > 0 && rules.length <= 500;
}

export function validateEdgeCases(edgeCases: string): boolean {
  return edgeCases.length <= 500;
}

export function validateLoggingAlerts(loggingAlerts: string): boolean {
  return loggingAlerts.length <= 500;
}

export function validateFeatureKeys(featureKeys: string[]): boolean {
  return featureKeys.length > 0 && featureKeys.every(key => key.length > 0);
}

export function validateTableKeys(tableKeys: string[]): boolean {
  return tableKeys.length > 0 && tableKeys.every(key => key.length > 0);
}

export function validateServiceKeys(serviceKeys: string[]): boolean {
  return serviceKeys.length > 0 && serviceKeys.every(key => key.length > 0);
}

export function validateFlags(flags: string[]): boolean {
  return flags.length > 0 && flags.every(flag => flag.length > 0);
}

export function validateTargetDuration(targetDuration: number): boolean {
  return targetDuration > 0;
}

export function validateTargetSuccessRate(targetSuccessRate: number): boolean {
  return targetSuccessRate >= 0 && targetSuccessRate <= 100;
}