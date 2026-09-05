<h1 align="center">
    hippoxOS
</h1>
<h4 align="center">
A native LLM operating system. </br>
make LLM the operating system interpretation layer.
</h4>
<p align="center">
    <a href="https://github.com/HippoxHQ/hippox-desktop/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-AGPL3.0-d1d1f6.svg?style=flat&labelColor=1C2C2E&color=BEC5C9&logo=googledocs&label=license&logoColor=BEC5C9" alt="License"></a>
</p>
<p align="center">
<a href="./README_zh-CN.md">简体中文</a> | <a href="./README.md">English</a>
</p>
<img src="https://github.com/HippoxHQ/assets/blob/main/banner/bg_6.jpg?raw=true" width="100%" >

## Official Channels & Community

| Platform         | URL                                                                                     |
| ---------------- | --------------------------------------------------------------------------------------- |
| Official Website | https://hippox.vercel.app/                                                              |
| X (Twitter)      | https://x.com/HippoxAI                                                                  |
| Bluesky          | https://bsky.app/profile/hippoxai.bsky.social                                           |
| Medium           | https://hippox.medium.com/                                                              |
| Discord          | https://discord.com/invite/jrcZHfZzr                                                    |
| Telegram         | https://t.me/hippoxAI                                                                   |
| YouTube          | https://www.youtube.com/@HippoxOS                                                       |
| Bilibili         | https://space.bilibili.com/9667583                                                      |
| QQ               | <img src="https://github.com/HippoxHQ/About/raw/main/assets/qq_QR.png" width="100">     |
| WeChat           | <img src="https://github.com/HippoxHQ/About/raw/main/assets/wechat_QR.png" width="100"> |

## Overview

HippoxOS is an AI-native desktop operating system. It is not a collection of applications in the traditional sense, but rather a complete operating system platform that uses natural language as its central interaction medium, designed to enable users to comprehensively control and orchestrate computer resources through conversation.

HippoxOS is powered by the proprietary **Hippox Kernel**, an operating system kernel purpose-built for natural language interaction. Unlike traditional operating system kernels, the Hippox Kernel does not directly schedule hardware resources. Instead, it orchestrates language model capabilities, driver execution, workflow orchestration, and system resource access control. Built upon the Hippox Kernel, HippoxOS establishes a complete driver system that translates user natural language input into system-executable operation instructions, achieving comprehensive control over the computer.

In HippoxOS, natural language is no longer merely an input form for chatbots; it is elevated to the primary interface for interacting with the file system, creative tools, data visualization, code development environments, and automation tasks. Users describe their intent through conversation, and the system parses and drives the Hippox Kernel to schedule the corresponding system resources and drivers for execution, thereby significantly lowering the barrier to entry for professional software and enhancing human-machine collaboration efficiency.

## Design Philosophy

HippoxOS is designed around three core principles:

1. **Conversation as Interface**: Natural language is the primary channel through which users interact with all system functions. Users do not need to learn the menus, shortcuts, or workflows of different software; they simply describe their goals to drive the system to complete tasks.

2. **Domain-Native Integration**: The system deeply integrates multiple professional domain tools—video editing, 3D modeling, geographic information, financial analysis, software development—as native capabilities rather than simply invoking external applications. Each domain possesses the ability to understand and execute professional instructions specific to that domain.

3. **Intelligent Task Orchestration**: The system provides task management and automation scheduling capabilities. Users can define scheduled tasks, and the system will automatically execute natural language instructions at specified times or intervals, enabling unattended automated workflows.

## Core Subsystems

### 1. General Conversation Subsystem

https://github.com/user-attachments/assets/6b7a0a7f-d573-4e5b-a49a-60669acf70ee

The General Conversation Subsystem is the foundational interaction layer of HippoxOS and the unified entry point for user interaction with the operating system. Built upon the Hippox Kernel, this subsystem integrates the full scheduling capabilities of the kernel and provides conversational infrastructure for all other professional domains.

When a user inputs natural language, the system first performs semantic analysis to determine whether the user intent matches any registered drivers. If a match is found, the system selects the most appropriate driver from the driver registry, extracts and validates the required parameters from the natural language, and drives the Hippox Kernel to execute the driver. If no match is found, it falls back to general LLM conversation mode. For complex tasks, the system can decompose the user intent into multiple subtasks and orchestrate their execution order, while maintaining multi-turn dialogue context to support task continuation and complex interactions.

**The Hippox Kernel, as the underlying scheduling engine of this subsystem**, provides the following core scheduling capabilities:

- **Driver Registration & Scheduling**: Manages the registration, discovery, and lifecycle of all system drivers, scheduling the appropriate driver for execution based on intent analysis results.
- **Workflow Orchestration**: Supports four workflow modes, automatically selecting the optimal execution strategy based on task complexity.
- **Task Management**: Manages the status, progress, token consumption, and execution history of all tasks, with support for pausing, resuming, and cancellation.
- **Resource Control**: Controls access to system resources such as the file system, network, and processes, ensuring secure execution.
- **Error Recovery & Retry**: Provides unified timeout protection, automatic retry, and error recovery mechanisms to ensure system stability.

The kernel employs multiple workflow modes to handle tasks of varying complexity:

| Workflow Mode      | Description                                                | Use Cases                                                 |
| ------------------ | ---------------------------------------------------------- | --------------------------------------------------------- |
| **ReAct**          | Reason-Act-Observe loop, with LLM decision at each step    | Open-ended tasks, dynamic decision-making, error recovery |
| **Batch**          | Parallel execution of multiple independent drivers         | Batch processing, independent operations                  |
| **Chain**          | Sequential execution with variable passing between drivers | Linear pipelines, data transformation chains              |
| **PlanAndExecute** | One-time workflow planning with conditional support        | Complex workflows, deterministic tasks                    |

### 2. Video Editing Subsystem

https://github.com/user-attachments/assets/9df94a10-6920-4636-9c7d-029b2bf2a04c

The Video Editing Subsystem transforms the traditional non-linear editing workflow into a conversation-driven creative experience. Users can describe editing intent through natural language, such as cutting clips, adjusting the timeline, or adding text and image overlays.

This subsystem is powered by a proprietary **NLE (Non-Linear Editing) Engine** responsible for all underlying video and audio data processing. The NLE Engine provides the following core capabilities:

- **Timeline Management**: Maintains a multi-track timeline data structure, supporting overlay and synchronization of different media types including video, audio, text, and images.
- **Multi-Camera Rendering**: Supports synchronized playback and real-time switching across multiple video track sources, enabling multi-camera editing workflows with simultaneous preview and selection of multiple camera angles.
- **Media Decoding & Encoding**: Supports decoding and encoding of various video, audio, and image formats, providing a unified media data access interface.
- **Clip Trimming & Assembly**: Provides frame-precise trimming (based on timecode), splicing, and arrangement of media clips with frame-level editing accuracy.
- **Transitions & Effects**: Offers a rich library of video transitions (fade, slide, wipe, zoom, etc.) and supports real-time rendering and compositing of image effects (transform, scale, rotate, blur, etc.).
- **Camera Motion Control**: Supports a keyframe animation system that enables dynamic interpolation of position, rotation, scale, focal length, and other parameters, achieving professional camera movements such as dolly, tilt, pan, and track.
- **Linear Animation**: Supports linear keyframe animation sequencing for overlay layer properties (position, opacity, rotation, scale), enabling smooth entry/exit animations and dynamic visual effects.
- **Filter System**: Includes a comprehensive filter library (LUT color grading, stylized filters, color grading, etc.) with real-time preview and parameter adjustment, applicable to individual clips or the entire timeline.
- **Overlay Management**: Supports creation, positioning, style configuration, and rendering composition of text overlays and image overlays.
- **Real-Time Preview**: Provides a low-latency real-time preview rendering pipeline, delivering immediate visual feedback for editing operations.

When users describe editing intent through natural language, the system parses the instructions and maps them to specific NLE Engine operations. Video creation no longer relies on complex timeline dragging and parameter adjustments—users simply describe the desired editing effect in natural language, and the system drives the Hippox Kernel to schedule the appropriate video editing drivers, which in turn drive the NLE Engine to perform the underlying media processing.

### 3. 3D Sandbox Subsystem

https://github.com/user-attachments/assets/e2d083fb-8bc5-4ad2-a766-e5112a7b0bb1

The 3D Sandbox Subsystem provides an environment for generating and manipulating three-dimensional scenes through conversation. Users can describe the 3D scene they wish to build in natural language, and the system generates the corresponding code and renders it in real-time within the viewport. All historically generated 3D scenes can be revisited and reused, with support for scene snapshot switching and GIF animation export, transforming 3D content creation from code writing to language description.

### 4. Maps & Geographic Information Subsystem

https://github.com/user-attachments/assets/c1a5f011-7cba-4968-8c16-67cedc336e4b

The Maps Subsystem integrates professional geographic information visualization capabilities. Users can place markers, draw routes, and create heatmaps and cluster analyses on maps through conversation. The system parses geographic intent and overlays corresponding layers and markers on the interactive Earth view, converting complex geospatial analysis into intuitive conversational interaction.

### 5. Financial Data Analysis Subsystem

https://github.com/user-attachments/assets/ca3ce94c-57de-4bed-b633-933fe8f737f3

The Financial Subsystem provides real-time financial data visualization and analysis capabilities. Users can query and display price trends and technical charts for financial products such as stocks and cryptocurrencies through conversation. The system integrates real-time market data, news tickers, and interactive candlestick charts, enabling users to explore and analyze financial data through dialogue.

### 6. Code Development Subsystem

https://github.com/user-attachments/assets/9cc68f1a-0c97-46c9-96c9-d794fd5e2788

The Code Development Subsystem deeply integrates AI-assisted programming into the desktop development environment. Users can describe development requirements through natural language, and the system drives code generation and modification. The core feature of this subsystem is the controllability of code changes—when AI modifies code, the system presents a side-by-side comparison view showing the differences before and after modification; changes are only applied after user confirmation, ensuring developers maintain full control over the codebase.

### 7. Scheduled Tasks & Automation Subsystem

The Scheduled Tasks Subsystem provides unattended automation execution capabilities. Users can create scheduled tasks through natural language, and the system automatically executes them at fixed times or periodic intervals. Tasks can contain natural language instructions or reference SKILL files, support multiple workflow mode options, and maintain complete execution history. Execution frequency is visualized through heatmaps, helping users understand the operational patterns of their automated tasks.

## Interaction & Layout System

### Unified Multi-Panel Layout

HippoxOS employs a consistent multi-panel layout architecture, with each domain workspace consisting of three columns: the history session panel, the conversational interaction panel, and the main workspace area. Panels support collapse and width adjustment, with layout preferences automatically persisted to ensure continuity across sessions.

### Session Management

The system provides unified session management across all domains, supporting session creation, switching, renaming, pinning, and deletion. Historical sessions are automatically categorized by time (Today, Yesterday, Last 7 Days, Last 30 Days, Older), with batch selection and operations support for efficient session management.

### Cross-Component Event Communication

The system features a built-in window-level event bus, enabling decoupled communication between subsystems. Editing operations, playback control, panel switching, and refresh requests are all transmitted through standardized event mechanisms, ensuring independent evolution of modules while maintaining overall system coordination.

## System Positioning

HippoxOS is positioned as a **"conversation-driven operating system"**, building an intelligent interaction layer atop the traditional operating system kernel. The Hippox Kernel, domain-specific engines, and desktop environment form an integrated whole, delivering a complete operating system experience:

- **For Creators**: Lowers the barrier to entry for professional tools in video, 3D, code, and other domains
- **For Analysts**: Enables complex geospatial and financial data analysis through conversation
- **For Automation Needs**: Defines scheduled tasks and automates workflows through natural language

The ultimate goal of HippoxOS is to transform human-computer interaction from "learning how tools operate" to "describing what to accomplish," thereby unleashing greater creativity and reducing investment in tool learning.

---

**Proprietary Software · All Rights Reserved**
