#!/usr/bin/env tsx
/**
 * Import content from Legacy folder into Repository database
 * Usage: tsx scripts/import-content.ts
 */

import { getDatabase } from "../lib/db";
import { initRepositorySchema } from "../lib/db-schema";
import * as fs from "fs";
import * as path from "path";


function getProjectRoot(): string {
  // Find the Laboratory directory by walking up from current location
  let currentDir = process.cwd();

  // If we're in the web folder, go up one level
  if (path.basename(currentDir) === "web") {
    currentDir = path.dirname(currentDir);
  }
  // If we're in scripts folder, go up two levels
  if (path.basename(currentDir) === "scripts") {
    currentDir = path.dirname(path.dirname(currentDir));
  }

  // Walk up to find Laboratory directory
  while (currentDir !== path.dirname(currentDir)) {
    if (path.basename(currentDir) === "Laboratory") {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  // Fallback: return the Developer Journal Workspace parent
  // This script must be run from within the project
  throw new Error("Could not find Laboratory directory. Run this script from within the project.");
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function parseFrontmatter(content: string): { frontmatter: any; body: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const frontmatterText = match[1];
  const body = match[2];
  const frontmatter: any = {};

  frontmatterText.split("\n").forEach((line) => {
    const [key, ...valueParts] = line.split(":");
    if (key && valueParts.length > 0) {
      const value = valueParts.join(":").trim().replace(/^['"]|['"]$/g, "");
      frontmatter[key.trim()] = value;
    }
  });

  return { frontmatter, body };
}

async function importWritings() {
  const db = getDatabase();
  const writingsPath = path.join(getProjectRoot(), "Legacy", "Words", "writings");
  
  if (!fs.existsSync(writingsPath)) {
    console.log("Writings folder not found, skipping...");
    return;
  }

  const years = fs.readdirSync(writingsPath);
  let imported = 0;

  for (const year of years) {
    const yearPath = path.join(writingsPath, year);
    if (!fs.statSync(yearPath).isDirectory()) continue;

    const files = fs.readdirSync(yearPath).filter((f) => f.endsWith(".md"));
    
    for (const file of files) {
      const filePath = path.join(yearPath, file);
      const content = fs.readFileSync(filePath, "utf-8");
      const { frontmatter, body } = parseFrontmatter(content);

      const title = frontmatter.title || path.basename(file, ".md");
      const slug = slugify(title);
      const metadata = {
        year: frontmatter.year || year,
        type: frontmatter.type || "essay",
        language: frontmatter.language || "en",
        series: frontmatter.series,
        series_index: frontmatter.series_index,
      };

      try {
        db.prepare(
          `INSERT OR IGNORE INTO documents (slug, type, title, content, language, metadata)
           VALUES (?, 'writing', ?, ?, ?, ?)`
        ).run(slug, title, body, metadata.language, JSON.stringify(metadata));
        imported++;
      } catch (error: any) {
        if (!error.message?.includes("UNIQUE constraint")) {
          console.error(`Error importing ${file}:`, error);
        }
      }
    }
  }

  console.log(`Imported ${imported} writings`);
}

async function importPrompts() {
  const db = getDatabase();
  const promptsPath = path.join(getProjectRoot(), "Legacy", "Prompting Story");
  
  if (!fs.existsSync(promptsPath)) {
    console.log("Prompts folder not found, skipping...");
    return;
  }

  const files = ["Kronus_Awoken.xml", "master_prompts.md"].filter((f) =>
    fs.existsSync(path.join(promptsPath, f))
  );
  let imported = 0;

  for (const file of files) {
    const filePath = path.join(promptsPath, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const title = path.basename(file, path.extname(file));
    const slug = slugify(title);

    try {
      db.prepare(
        `INSERT OR IGNORE INTO documents (slug, type, title, content, language, metadata)
         VALUES (?, 'prompt', ?, ?, 'en', ?)`
      ).run(slug, title, content, JSON.stringify({ source: file }));
      imported++;
    } catch (error: any) {
      if (!error.message?.includes("UNIQUE constraint")) {
        console.error(`Error importing ${file}:`, error);
      }
    }
  }

  console.log(`Imported ${imported} prompts`);
}

async function importCV() {
  const db = getDatabase();
  const dataPath = path.join(getProjectRoot(), "data");

  // Import skills
  const skillsPath = path.join(dataPath, "skills.json");
  if (fs.existsSync(skillsPath)) {
    const skillsData = JSON.parse(fs.readFileSync(skillsPath, "utf-8"));
    let imported = 0;
    for (const skill of skillsData.skills || []) {
      try {
        db.prepare(
          `INSERT OR IGNORE INTO skills (id, name, category, magnitude, description, icon, color, url, tags, firstUsed, lastUsed)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          skill.id,
          skill.name,
          skill.category,
          skill.magnitude,
          skill.description,
          skill.icon || null,
          skill.color || null,
          skill.url || null,
          JSON.stringify(skill.tags || []),
          skill.firstUsed || null,
          skill.lastUsed || null
        );
        imported++;
      } catch (error: any) {
        if (!error.message?.includes("UNIQUE constraint")) {
          console.error(`Error importing skill ${skill.id}:`, error);
        }
      }
    }
    console.log(`Imported ${imported} skills`);
  }

  // Import work experience
  const experiencePath = path.join(dataPath, "work-experience.json");
  if (fs.existsSync(experiencePath)) {
    const experienceData = JSON.parse(fs.readFileSync(experiencePath, "utf-8"));
    let imported = 0;
    for (const exp of experienceData || []) {
      try {
        db.prepare(
          `INSERT OR IGNORE INTO work_experience (id, title, company, department, location, dateStart, dateEnd, tagline, note, achievements)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          exp.id,
          exp.title,
          exp.company,
          exp.department || null,
          exp.location,
          exp.dateStart,
          exp.dateEnd || null,
          exp.tagline,
          exp.note || null,
          JSON.stringify(exp.achievements || [])
        );
        imported++;
      } catch (error: any) {
        if (!error.message?.includes("UNIQUE constraint")) {
          console.error(`Error importing experience ${exp.id}:`, error);
        }
      }
    }
    console.log(`Imported ${imported} work experience entries`);
  }

  // Import education
  const educationPath = path.join(dataPath, "education.json");
  if (fs.existsSync(educationPath)) {
    const educationData = JSON.parse(fs.readFileSync(educationPath, "utf-8"));
    let imported = 0;
    for (const edu of educationData || []) {
      try {
        db.prepare(
          `INSERT OR IGNORE INTO education (id, degree, field, institution, location, dateStart, dateEnd, tagline, note, focusAreas, achievements)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          edu.id,
          edu.degree,
          edu.field,
          edu.institution,
          edu.location,
          edu.dateStart,
          edu.dateEnd,
          edu.tagline,
          edu.note || null,
          JSON.stringify(edu.focusAreas || []),
          JSON.stringify(edu.achievements || [])
        );
        imported++;
      } catch (error: any) {
        if (!error.message?.includes("UNIQUE constraint")) {
          console.error(`Error importing education ${edu.id}:`, error);
        }
      }
    }
    console.log(`Imported ${imported} education entries`);
  }
}

async function main() {
  console.log("Initializing Repository schema...");
  initRepositorySchema();

  console.log("\nImporting writings...");
  await importWritings();

  console.log("\nImporting prompts...");
  await importPrompts();

  console.log("\nImporting CV data...");
  await importCV();

  console.log("\n✅ Import complete!");
}

main().catch(console.error);
