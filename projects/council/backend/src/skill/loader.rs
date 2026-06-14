use std::fs;
use std::path::Path;

use crate::skill::types::{Case, CounselorSkill, KnowledgeFragment, Personality, Questions, Quotes};

pub struct SkillLoader {
    skills_dir: PathBuf,
}

impl SkillLoader {
    pub fn new(skills_dir: PathBuf) -> Self {
        Self { skills_dir }
    }

    pub fn load_all(&self) -> Result<Vec<CounselorSkill>, Box<dyn std::error::Error>> {
        let mut skills = Vec::new();

        for entry in fs::read_dir(&self.skills_dir)? {
            let entry = entry?;
            let path = entry.path();

            if path.is_dir() {
                // New format: skill directory with index.md
                let index_path = path.join("index.md");
                if index_path.exists() {
                    if let Ok(skill) = self.load_skill_from_dir(&path) {
                        skills.push(skill);
                    }
                }
            } else if path.extension().and_then(|s| s.to_str()) == Some("md") {
                // Legacy format: single .md file
                if let Ok(skill) = self.load_skill(&path) {
                    skills.push(skill);
                }
            }
        }

        Ok(skills)
    }

    pub fn load_skill_from_dir(&self, dir_path: &Path) -> Result<CounselorSkill, Box<dyn std::error::Error>> {
        let index_path = dir_path.join("index.md");
        let content = fs::read_to_string(&index_path)?;
        let dir_name = dir_path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();

        // Parse display name from first line of index.md (e.g., "# 张良（约前250年—前186年）")
        let display_name = content.lines()
            .next()
            .map(|l| l.trim_start_matches("# ").to_string())
            .unwrap_or_else(|| dir_name.clone());

        Ok(CounselorSkill {
            name: dir_name,
            display_name,
            personality: Personality {
                traits: vec![],
                decision_style: String::new(),
                values: vec![],
            },
            cases: vec![],
            quotes: Quotes {
                on_strategy: String::new(),
                on_risk: String::new(),
                on_human_nature: String::new(),
            },
            questions: Questions {
                general: vec![],
                customized: vec![],
                by_scenario: vec![],
            },
            knowledge_fragments: vec![],
        })
    }

    pub fn load_skill(&self, path: &Path) -> Result<CounselorSkill, Box<dyn std::error::Error>> {
        let content = fs::read_to_string(path)?;
        let skill = parse_markdown(&content)?;
        Ok(skill)
    }
}

fn parse_markdown(content: &str) -> Result<CounselorSkill, Box<dyn std::error::Error>> {
    let lines: Vec<&str> = content.lines().collect();
    let mut name = String::new();
    let mut traits = Vec::new();
    let mut decision_style = String::new();
    let mut values = Vec::new();
    let mut cases = Vec::new();
    let mut on_strategy = String::new();
    let mut on_risk = String::new();
    let mut on_human_nature = String::new();
    let mut general_questions = Vec::new();
    let mut customized_questions = Vec::new();
    let mut scenario_questions = Vec::new();
    let mut knowledge_fragments = Vec::new();

    let mut section = String::new();
    let mut current_case: Option<Case> = None;
    let mut in_case = false;

    for line in lines {
        let trimmed = line.trim();

        // Track section headers
        if trimmed.starts_with("## ") {
            section = "main".to_string();
        } else if trimmed.starts_with("### ") {
            let section_name = trimmed.trim_start_matches("### ").trim();
            section = section_name.to_string();

            if section_name.contains("案例") {
                in_case = true;
                if let Some(c) = current_case.take() {
                    cases.push(c);
                }
                // Create case immediately from section_name
                let case_title = section_name.trim_start_matches("案例").trim_start_matches(|c: char| c.is_numeric() || c == '：' || c == ':' || c == ' ');
                current_case = Some(Case {
                    title: case_title.to_string(),
                    background: String::new(),
                    decision: String::new(),
                    result: String::new(),
                });
            } else {
                in_case = false;
                if let Some(c) = current_case.take() {
                    cases.push(c);
                }
            }
        }

        // Parse content based on current section
        if section == "人格与思维模式" {
            if trimmed.starts_with("沉稳、") || trimmed.starts_with("谨慎、") || trimmed.starts_with("谦逊、") || trimmed.starts_with("睿智、") {
                traits = trimmed.split('、').map(String::from).collect();
            } else if trimmed.starts_with("奇正结合") || trimmed.starts_with("知己知彼") || trimmed.starts_with("审时度势") || trimmed.starts_with("洞察本质") {
                decision_style = trimmed.to_string();
            } else if trimmed.starts_with("天下为公") || trimmed.starts_with("鞠躬尽瘁") || trimmed.starts_with("匡扶汉室") || trimmed.starts_with("功成身退") {
                values = trimmed.split('，').map(String::from).collect();
            }
        } else if in_case && !trimmed.starts_with("### ") && !trimmed.is_empty() {
            if let Some(ref mut case) = current_case {
                if trimmed.starts_with("**背景**") {
                    case.background = trimmed.trim_start_matches("**背景**：").to_string();
                } else if trimmed.starts_with("**决策") {
                    let content = trimmed.trim_start_matches("**决策").trim_start_matches("过程**：").to_string();
                    if case.decision.is_empty() {
                        case.decision = content;
                    } else {
                        case.decision.push('\n');
                        case.decision.push_str(&content);
                    }
                } else if trimmed.starts_with("**结果**") {
                    case.result = trimmed.trim_start_matches("**结果**：").to_string();
                } else if trimmed.starts_with("- ") {
                    let bullet = trimmed.trim_start_matches("- ");
                    // Determine which field to accumulate into
                    if case.background.is_empty() {
                        case.background.push_str(bullet);
                    } else if case.decision.is_empty() {
                        case.decision.push_str(bullet);
                    } else {
                        case.decision.push('\n');
                        case.decision.push_str(bullet);
                    }
                }
            }
        } else if section == "观点语录" || section.contains("看法") {
            // Handle quoted lines for strategy, risk, human nature
            if trimmed.starts_with('"') && !trimmed.is_empty() {
                // This is a quote - determine which category
                let lower = trimmed.to_lowercase();
                if lower.contains("战略") || lower.contains("善弈") || lower.contains("高筑墙") || lower.contains("集及贯") {
                    if on_strategy.is_empty() {
                        on_strategy = trimmed.to_string();
                    }
                } else if lower.contains("风险") || lower.contains("危事") || lower.contains("谋事") || lower.contains("慎终") || lower.contains("千金") {
                    if on_risk.is_empty() {
                        on_risk = trimmed.to_string();
                    }
                } else if lower.contains("人性") || lower.contains("仁义") || lower.contains("以柔") || lower.contains("水至清") || lower.contains("亲贤臣") {
                    if on_human_nature.is_empty() {
                        on_human_nature = trimmed.to_string();
                    }
                }
            }
        } else if section == "苏格拉底追问模板" || section == "通用问题" || section == "张良定制问题" || section == "诸葛亮定制问题" || section == "荀彧定制问题" || section == "刘伯温定制问题" {
            if trimmed.starts_with('-') && !trimmed.starts_with("- **") {
                let question = trimmed.trim_start_matches('-').trim().to_string();
                if section == "通用问题" {
                    general_questions.push(question);
                } else if section == "张良定制问题" || section == "诸葛亮定制问题" || section == "荀彧定制问题" || section == "刘伯温定制问题" {
                    customized_questions.push(question);
                } else if section.contains("场景") {
                    scenario_questions.push(question);
                }
            }
        } else if section == "知识碎片索引" || section.contains("系列") || section.contains("关键概念") {
            if trimmed.starts_with('-') {
                // Handle both - **Topic**：content and - Topic：content formats
                let content = trimmed.trim_start_matches('-').trim();
                let parts: Vec<&str> = if content.contains("**：") {
                    content.splitn(2, "**：").collect()
                } else if content.contains("：") {
                    content.splitn(2, '：').collect()
                } else {
                    vec![]
                };
                if parts.len() == 2 {
                    knowledge_fragments.push(KnowledgeFragment {
                        topic: parts[0].trim().trim_start_matches("**").to_string(),
                        content: parts[1].trim().to_string(),
                    });
                }
            }
        }
    }

    // Push last case if exists
    if let Some(c) = current_case.take() {
        cases.push(c);
    }

    // Extract name from first line
    if content.starts_with("# ") {
        name = content.lines().next().unwrap().trim_start_matches("# ").to_string();
    }

    Ok(CounselorSkill {
        name: name.clone(),
        display_name: name,
        personality: Personality {
            traits,
            decision_style,
            values,
        },
        cases,
        quotes: Quotes {
            on_strategy,
            on_risk,
            on_human_nature,
        },
        questions: Questions {
            general: general_questions,
            customized: customized_questions,
            by_scenario: scenario_questions,
        },
        knowledge_fragments,
    })
}

use std::path::PathBuf;