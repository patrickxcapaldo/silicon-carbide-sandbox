export interface Parameter {
  id: string;
  name: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  description: string;
}

export interface Equation {
  id: string;
  label: string;
  latex: string;
  description: string;
}

export interface Result {
  outputs: Record<string, { label: string; value: number; unit: string; description?: string }>;
  warnings?: string[];
}

export interface SubstackArticle {
  title: string;
  url: string;
  publishedAt: string; // ISO date string: YYYY-MM-DD
  summary?: string;
}

export interface Manifest {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  articleUrl?: string; // Main editorial link
  relatedArticles?: SubstackArticle[]; // Tagged/sorted article series
  parameters: Parameter[];
  equations: Equation[];
}

export interface Module {
  manifest: Manifest;
  compute: (inputs: Record<string, number>) => Result;
  View?: React.ComponentType<{
    inputs: Record<string, number>;
    onChange: (id: string, value: number) => void;
    results: Result;
  }>;
}