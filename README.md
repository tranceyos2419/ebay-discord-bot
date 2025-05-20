# eBay Discord Bot

# Contents

- [Specification](#Specification)
- [Branch](#branch)
- [Installation](#installation)
- [Development setup](#development-setup)

# Specification

### [Documentation](https://docs.google.com/document/d/1NFoMUEQLj0apAdCRShHBQuwz1Sp_nVimRieTHivnTuY/edit?usp=sharing)<br>

# Branch

Please develop features on feature/[name] branches and merge them into the dev branch. <br>
Please leave a comment to describe what you did to each commit

> main: for the production
>
> > dev : for developing the app <br>
> >
> > > feature/[name] : for developing individual features <br>
> > > bugfix/[name] : for fixing bugs

# Installation

Make sure you have node.js, and pnpm installed locally, and type the bash script in the project folder to install dependencies

```bash
pnpm i
```

# Development Setup

###### Make sure you have done installation and configuration

Run typescript compiler from npm script

```bash
pnpm run start
```

# Directory Structure

└── src
    ├── config
    │   ├── load-env.ts
    ├── service
    │   ├── bot.ts
    └── types
        ├── thread_data.ts
    ├── index.ts
├── .env
├── .gitignore
├── Makefile
├── README.md
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.json

# End Directory Structure