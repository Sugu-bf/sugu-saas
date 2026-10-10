import type { ZodError } from "zod";
import { Alert } from "../primitives/alert";

/**
 * First message per field from a Zod error, keyed by dotted path
 * (`"address.city"`). Form-level issues land under `""`.
 */
export function fieldErrorsFromZod(error: ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!(key in result)) result[key] = issue.message;
  }
  return result;
}

export interface FormErrorSummaryProps {
  /** Field errors, keyed like `fieldErrorsFromZod`. */
  errors: Record<string, string>;
  /** Human label and control id per field key, to link each line to its field. */
  fields: Record<string, { label: string; id?: string }>;
  title?: string;
}

/** Recap of what blocks submission, shown at the top of long or multi-step forms. */
export function FormErrorSummary({ errors, fields, title }: FormErrorSummaryProps) {
  const entries = Object.entries(errors);
  if (entries.length === 0) return null;
  return (
    <Alert
      tone="danger"
      title={title ?? (entries.length === 1 ? "1 champ à corriger" : `${entries.length} champs à corriger`)}
    >
      <ul className="list-disc pl-4">
        {entries.map(([key, message]) => {
          const field = fields[key];
          const text = field ? `${field.label} : ${message}` : message;
          return (
            <li key={key}>
              {field?.id ? (
                <a href={`#${field.id}`} className="underline underline-offset-2">
                  {text}
                </a>
              ) : (
                text
              )}
            </li>
          );
        })}
      </ul>
    </Alert>
  );
}
