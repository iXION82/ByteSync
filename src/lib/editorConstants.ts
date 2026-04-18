
export interface LanguageConfig {
  id: string;
  label: string;
  monacoLang: string;
  pistonLang: string;
  pistonVersion: string;
  starterCode: string;
}

export const LANGUAGES: LanguageConfig[] = [
  {
    id: "javascript",
    label: "JavaScript",
    monacoLang: "javascript",
    pistonLang: "javascript",
    pistonVersion: "18.15.0",
    starterCode: `// ByteSync — JavaScript
// Welcome to the Solo Room!

function greet(name) {
  return \`Hello, \${name}! Welcome to ByteSync.\`;
}

const languages = ["JavaScript", "Python", "TypeScript", "C++", "Java"];

console.log(greet("Developer"));
console.log("Supported languages:", languages.join(", "));

// Try writing your own code below:
`,
  },
  {
    id: "python",
    label: "Python",
    monacoLang: "python",
    pistonLang: "python",
    pistonVersion: "3.10.0",
    starterCode: `# ByteSync — Python
# Welcome to the Solo Room!

def greet(name: str) -> str:
    return f"Hello, {name}! Welcome to ByteSync."

languages = ["JavaScript", "Python", "TypeScript", "C++", "Java"]

print(greet("Developer"))
print("Supported languages:", ", ".join(languages))

# Try writing your own code below:
`,
  },
  {
    id: "typescript",
    label: "TypeScript",
    monacoLang: "typescript",
    pistonLang: "typescript",
    pistonVersion: "5.0.3",
    starterCode: `// ByteSync — TypeScript
// Welcome to the Solo Room!

interface User {
  name: string;
  role: string;
}

function greet(user: User): string {
  return \`Hello, \${user.name}! You are a \${user.role}.\`;
}

const dev: User = { name: "Developer", role: "Solo Coder" };

console.log(greet(dev));
console.log("TypeScript is running in ByteSync!");

// Try writing your own code below:
`,
  },
  {
    id: "cpp",
    label: "C++",
    monacoLang: "cpp",
    pistonLang: "c++",
    pistonVersion: "10.2.0",
    starterCode: `// ByteSync — C++
// Welcome to the Solo Room!

#include <iostream>
#include <vector>
#include <string>

int main() {
    std::string name = "Developer";
    std::cout << "Hello, " << name << "! Welcome to ByteSync." << std::endl;

    std::vector<std::string> languages = {"C++", "JavaScript", "Python"};
    std::cout << "Supported languages: ";
    for (size_t i = 0; i < languages.size(); i++) {
        std::cout << languages[i];
        if (i < languages.size() - 1) std::cout << ", ";
    }
    std::cout << std::endl;

    // Try writing your own code below:

    return 0;
}
`,
  },
  {
    id: "java",
    label: "Java",
    monacoLang: "java",
    pistonLang: "java",
    pistonVersion: "15.0.2",
    starterCode: `// ByteSync — Java
// Welcome to the Solo Room!

public class Main {
    public static void main(String[] args) {
        String name = "Developer";
        System.out.println("Hello, " + name + "! Welcome to ByteSync.");

        String[] languages = {"Java", "JavaScript", "Python", "C++"};
        System.out.print("Supported languages: ");
        System.out.println(String.join(", ", languages));

        // Try writing your own code below:
    }
}
`,
  },
  {
    id: "go",
    label: "Go",
    monacoLang: "go",
    pistonLang: "go",
    pistonVersion: "1.16.2",
    starterCode: `// ByteSync — Go
// Welcome to the Solo Room!

package main

import (
\t"fmt"
\t"strings"
)

func greet(name string) string {
\treturn fmt.Sprintf("Hello, %s! Welcome to ByteSync.", name)
}

func main() {
\tfmt.Println(greet("Developer"))

\tlanguages := []string{"Go", "JavaScript", "Python", "C++"}
\tfmt.Println("Supported languages:", strings.Join(languages, ", "))

\t// Try writing your own code below:
}
`,
  },
  {
    id: "rust",
    label: "Rust",
    monacoLang: "rust",
    pistonLang: "rust",
    pistonVersion: "1.68.2",
    starterCode: `// ByteSync — Rust
// Welcome to the Solo Room!

fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to ByteSync.", name)
}

fn main() {
    println!("{}", greet("Developer"));

    let languages = vec!["Rust", "JavaScript", "Python", "C++"];
    let joined = languages.join(", ");
    println!("Supported languages: {}", joined);

    // Try writing your own code below:
}
`,
  },
  {
    id: "c",
    label: "C",
    monacoLang: "c",
    pistonLang: "c",
    pistonVersion: "10.2.0",
    starterCode: `// ByteSync — C
// Welcome to the Solo Room!

#include <stdio.h>

int main() {
    char name[] = "Developer";
    printf("Hello, %s! Welcome to ByteSync.\\n", name);

    char *languages[] = {"C", "JavaScript", "Python", "C++"};
    int count = sizeof(languages) / sizeof(languages[0]);

    printf("Supported languages: ");
    for (int i = 0; i < count; i++) {
        printf("%s", languages[i]);
        if (i < count - 1) printf(", ");
    }
    printf("\\n");

    // Try writing your own code below:

    return 0;
}
`,
  },
];

export function getLanguageById(id: string): LanguageConfig | undefined {
  return LANGUAGES.find((lang) => lang.id === id);
}

export const DEFAULT_LANGUAGE_ID = "javascript";

const EXT_TO_LANGUAGE: Record<string, string> = {
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  java: "java",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  c: "c",
  h: "c",
  go: "go",
  rs: "rust",
  html: "html",
  css: "css",
  json: "json",
  md: "markdown",
  txt: "plaintext",
};

const LANGUAGE_TO_EXT: Record<string, string> = {
  javascript: "js",
  typescript: "ts",
  python: "py",
  java: "java",
  cpp: "cpp",
  c: "c",
  go: "go",
  rust: "rs",
  html: "html",
  css: "css",
  json: "json",
  markdown: "md",
};

export function inferLanguageFromFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return EXT_TO_LANGUAGE[ext] || "javascript";
}

export function getExtensionForLanguage(languageId: string): string {
  return LANGUAGE_TO_EXT[languageId] || "txt";
}

export function getMonacoLangForId(languageId: string): string {
  const lang = LANGUAGES.find((l) => l.id === languageId);
  return lang?.monacoLang || languageId;
}
