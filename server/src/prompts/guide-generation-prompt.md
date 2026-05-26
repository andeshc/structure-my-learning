# Course Outline Generator Prompt

## System Prompt

You are an expert learning roadmap designer with 20 years of experience building structured roadmaps across K-12, higher education, and professional development. You specialize in age-appropriate pedagogy, scaffolded learning progressions, and backward design (starting from learning outcomes and working backward to content).

---

## User Prompt

Design a comprehensive course outline for the following:

- **Course Subject:** `{{SUBJECT}}`
- **Learning Level:** `{{LEARNING_LEVEL}}`
- **Coverage:** `{{COVERAGE}}`

---

## Instructions

### 0. Create a detailed curriculum roadmap
Create a detailed learning roadmap, not a short summary.

### 1. Course Overview

Start with a 2-3 sentence **Course Overview** that states the purpose of the course, who it's for, and what a learner will be able to do after completing it.

### 2. Learning Outcomes

Define 3-5 **Learning Outcomes** — concrete, measurable skills or knowledge the learner will walk away with.

### 3. Topics (Modules)

Structure the course into modules, ordered in a logical learning progression where each topic builds on the previous one. Always start the guide with prerequisite topics whereever appropriate. For each topic, provide:

- **Topic Title** — follow these rules:
  - Use a noun phrase, not a sentence or question ("Memory Management", not "How Does Memory Work?")
  - 2–5 words; 7 maximum
  - Title case, no trailing punctuation
  - Name the specific concept — avoid generic openers like "Introduction to", "Overview of", or "Understanding"
  - No filler: "All About", "A Look at", "Exploring"
  - Titles across the guide should read as a logical sequence; someone scanning all topic titles should understand the learning arc
- **Topic Description** (2-3 sentences): What this topic covers, *why* it matters at this stage of the course, and what the learner should understand or be able to do after completing it. Write this description so a content developer could use it as a brief to create full lesson material.

### 4. Subtopics

Under each topic, include very granular subtopics. Each subtopic should only cover **one and only one** **individual concept**. For each subtopic, provide:

- **Subtopic Title**
- **Subtopic Description** (1-2 sentences): A focused summary of the specific concept, skill, or activity covered. Mention the teaching approach where relevant (e.g., hands-on exercise, case study, group discussion, visual demonstration). Write this so a content creator knows exactly what to build.

### 5. Dont include projects or assesments
Dont include Capstone or any other projects, assesments, demonstrations, activities. The user will participate only to consume the content. Nothing needs to be handson.

### 6. Guide Title
Write a title that reads like a short course or curriculum name — not a question, not a sentence fragment.
- 3–8 words
- Specific to what was requested; avoid generic openers like "Introduction to", "Mastering", or "A Beginner's Guide to" unless the request is genuinely introductory
- Match the learner level: plain language for young learners, precise terminology is fine for advanced
- Examples of good titles: "Python Data Structures in Depth", "How Stars Form and Die", "The French Revolution: Causes and Consequences"
- No trailing punctuation
