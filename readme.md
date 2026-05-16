# DevFlow Studio

**DevFlow Studio** is a visual backend IDE that allows developers to design backend systems using structured nodes and automatically generate deterministic, production-ready code.

> Design visually → Generate deterministically → Run instantly

---

## 🚀 Overview

DevFlow Studio is **not an AI code generator**.

It is a **deterministic, compiler-like system** where:

```
Visual Graph → Structured Representation → Template Engine → Backend Code
```
![DevFlow UI](https://i.postimg.cc/1Xn4mNZR/image.png)

Every node, connection, and configuration directly maps to code using predefined rules.
The same design always produces the same output.

---

## 🎯 Core Philosophy

* ❌ No AI-based backend generation
* ❌ No prompt-based ambiguity
* ✅ Fully deterministic system
* ✅ Strong structure and constraints
* ✅ Visual design as the single source of truth

DevFlow behaves more like a **domain-specific backend compiler** than a code generator.

---

## 🧩 Key Features

### 🗂️ Project System

* Create and manage projects locally
* `.devflow` file stores graph structure
* Project type selection (Frontend / Backend / Fullstack)
* Auto-restore last opened project

---

### 🎨 Visual Canvas

* Built using ReactFlow
* Drag-and-drop node system
* Multi-handle connections (data flow)
* Node renaming and configuration
* Auto-save graph state

---

### 🧱 Node-Based Architecture

DevFlow uses **structured modules**, not generic blocks.

#### 1. Endpoint Node

* Defines API route and method (GET, POST, etc.)
* Handles both input and response
* Maps output variables to response fields

#### 2. Logic Node

* Performs operations (query, validate, transform, etc.)
* Fully connection-driven (no manual input)
* Each node performs a single, well-defined task

#### 3. Database Node

* Defines schema using fields and types
* Supports relational modeling
* Automatically manages foreign keys

---

### 🗄️ Database Modeling

* Visual relational schema builder
* One-to-Many relationships supported
* Foreign keys automatically placed on the "many" side
* No duplicate or mirrored relations
* Clean SQLAlchemy model generation

---

### 🔌 Connection-Driven System

* Edges represent **data flow**
* Nodes only access data from connected sources
* No manual typing of fields or references
* Database fields are exposed only through connections

> No connection → No access → No generation

---

### 🧠 Logic System

Logic nodes represent **execution steps**, not functions.

Supported operations include:

* Query (fetch records)
* Insert / Update / Delete
* Validation (required, format, rules)
* Authentication (basic, JWT, hashing)
* Transformation (map, format, extract)
* Utilities (pagination, sorting, filtering)
* Conditional logic

---

### ⚙️ Deterministic Code Generation

DevFlow uses a **template-based engine**:

* Each node maps to predefined templates
* Logic nodes generate **code snippets**, not full functions
* Each Endpoint compiles into **one cohesive function**
* No randomness, no AI inference

---

### 📁 Generated Output

```
/project
  app.py         # API routes
  models.py      # Database schema
  functions.py   # Helper functions (optional)
```

---

### 💻 Integrated Terminal

* Powered by `node-pty` + `xterm.js`
* Runs inside project directory
* Executes build and run commands
* Automatically activates environment (if configured)

---

## 🛠️ Build System

### 🔹 Build Flow

```
Graph → Parse → Intermediate Representation → Code Generation → File Creation
```

---

### 🔹 Project Initialization

* Terminal expands on build
* Executes framework setup commands
* Supports Python virtual environment setup
* Saves user preferences
* Auto-activates environment on run

---

### 🔹 Code Generation Strategy

* Endpoint → One main function
* Logic Nodes → Sequential code steps inside function
* DB Nodes → SQLAlchemy models
* Templates ensure consistency across frameworks

---

### 🔄 Live Sync (Planned / In Progress)

* Graph is the source of truth
* Updating nodes updates generated code
* Modular regeneration system

---

## 🧠 Architecture

DevFlow internally works like a compiler:

* **Graph** → Visual syntax
* **IR (Intermediate Representation)** → Structured backend logic
* **Generator** → Template-based code emission

---

## ⚠️ Design Principles

* Avoid turning system into a flowchart tool
* Avoid AI-based code generation
* Enforce strict structure and validation
* Nodes must be meaningful modules
* Everything must be deterministic

---

## 🧪 Current Status

### ✅ Completed

* UI/UX system
* Node architecture
* Canvas + connections
* Database modeling
* Project system
* Terminal integration

### 🚧 In Progress

* Code generator (Flask)
* Graph parsing → IR
* Template engine
* Build system

### 🔮 Planned

* Multi-framework support
* Live code sync
* Advanced logic operations
* Deployment integration

---

## 🧭 Example Flow

```
POST /signup

Endpoint
 ↓
Validate Input
 ↓
Check User Exists
 ↓
Hash Password
 ↓
Insert User
 ↓
Generate Token
 ↓
Response (handled by Endpoint)
```

---

## 💡 Key Insight

DevFlow is not just a visual builder.

It is a:

> **Domain-Specific Backend Compiler with a Visual Interface**

---

## 🏁 Goal

To create a system where:

> A user designs backend logic visually →
> Clicks "Build" →
> Gets a working, production-ready backend →
> Runs it instantly

---

## 🤝 Contributing

(Coming soon)

---

## 📜 License

This project is licensed under the **MIT License** - see the [LICENSE](./LICENSE) file for details.

---

## ❤️ Final Note

DevFlow Studio is built on a simple belief:

> Clarity in design leads to correctness in execution.
