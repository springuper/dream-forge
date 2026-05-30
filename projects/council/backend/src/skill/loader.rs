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

            if path.extension().and_then(|s| s.to_str()) == Some("md") {
                if let Ok(skill) = self.load_skill(&path) {
                    skills.push(skill);
                }
            }
        }

        Ok(skills)
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
    let mut case_index = 0;

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
                case_index = 0;
                if let Some(c) = current_case.take() {
                    cases.push(c);
                }
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
        } else if in_case && trimmed.starts_with("案例") {
            if let Some(c) = current_case.take() {
                cases.push(c);
            }
            let case_num = trimmed.trim_start_matches("案例").trim_start_matches(|c: char| c.is_numeric() || c == '：' || c == ':');
            current_case = Some(Case {
                title: case_num.to_string(),
                background: String::new(),
                decision: String::new(),
                result: String::new(),
            });
        } else if in_case {
            if trimmed.starts_with("**背景**") {
                current_case.as_mut().unwrap().background = trimmed.trim_start_matches("**背景**：").to_string();
            } else if trimmed.starts_with("**决策**") {
                current_case.as_mut().unwrap().decision = trimmed.trim_start_matches("**决策**：").to_string();
            } else if trimmed.starts_with("**结果**") {
                current_case.as_mut().unwrap().result = trimmed.trim_start_matches("**结果**：").to_string();
            }
        } else if section == "观点语录" {
            if trimmed.starts_with("\"善弈者") || trimmed.starts_with("\"夫君子") || trimmed.starts_with("\"集以及贯") || trimmed.starts_with("\"高筑墙") {
                on_strategy = trimmed.to_string();
            } else if trimmed.starts_with("\"危事") || trimmed.starts_with("\"谋事") || trimmed.starts_with("\"慎终") || trimmed.starts_with("\"千金之子") {
                on_risk = trimmed.to_string();
            } else if trimmed.starts_with("\"以柔") || trimmed.starts_with("\"亲贤臣") || trimmed.starts_with("\"仁义") || trimmed.starts_with("\"水至清") {
                on_human_nature = trimmed.to_string();
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
        } else if section == "知识碎片索引" {
            if trimmed.starts_with('-') {
                let parts: Vec<&str> = trimmed.trim_start_matches('-').splitn(2, '：').collect();
                if parts.len() == 2 {
                    knowledge_fragments.push(KnowledgeFragment {
                        topic: parts[0].trim().to_string(),
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
        name,
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