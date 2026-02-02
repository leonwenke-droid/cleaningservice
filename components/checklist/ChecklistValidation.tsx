"use client";

/**
 * Client-side validation helper
 * This complements server-side validation
 */
export class ChecklistValidation {
  static validateRequired(item: { required: boolean; item_key: string }, value: any): string | null {
    if (item.required && (value === null || value === undefined || value === "")) {
      return "This field is required";
    }
    return null;
  }

  static validateRating(item: { validation_rules: Record<string, any> }, value: any): string | null {
    if (value === null || value === undefined) return null;

    const numValue = typeof value === "number" ? value : parseInt(value);
    if (isNaN(numValue)) {
      return "Invalid rating value";
    }

    const min = item.validation_rules?.min ?? 1;
    const max = item.validation_rules?.max ?? 5;

    if (numValue < min || numValue > max) {
      return `Rating must be between ${min} and ${max}`;
    }

    return null;
  }

  static validateInteger(item: { validation_rules: Record<string, any> }, value: any): string | null {
    if (value === null || value === undefined) return null;

    const numValue = typeof value === "number" ? value : parseInt(value);
    if (isNaN(numValue)) {
      return "Invalid number";
    }

    const min = item.validation_rules?.min;
    const max = item.validation_rules?.max;

    if (min !== undefined && numValue < min) {
      return `Value must be at least ${min}`;
    }
    if (max !== undefined && numValue > max) {
      return `Value must be at most ${max}`;
    }

    return null;
  }

  static validateText(item: { validation_rules: Record<string, any> }, value: any): string | null {
    if (value === null || value === undefined) return null;

    const text = String(value);
    const maxLength = item.validation_rules?.max_length;

    if (maxLength && text.length > maxLength) {
      return `Text must be ${maxLength} characters or less`;
    }

    return null;
  }

  static checkDeviationRules(
    scoreItems: Array<{ id: string; item_key: string; value: any }>,
    deviationReason: any,
    hasPhoto: boolean
  ): { requiresReason: boolean; requiresPhoto: boolean } {
    const hasLowScore = scoreItems.some(
      (item) => typeof item.value === "number" && item.value <= 2
    );

    return {
      requiresReason: hasLowScore && (!deviationReason || deviationReason === ""),
      requiresPhoto: hasLowScore && !hasPhoto,
    };
  }
}
