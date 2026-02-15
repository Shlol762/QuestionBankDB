from enum import Enum


class DifficultyLevel(str, Enum):
    """Question difficulty levels"""
    EASY = "Easy"
    MEDIUM = "Medium"
    HARD = "Hard"


class QuestionType(str, Enum):
    """Question type categories"""
    MCQ = "MCQ"
    TRUE_FALSE = "True/False"
    MATCH_THE_FOLLOWING = "Match the Following"
    SHORT_ANSWER = "Short Answer"
    LONG_ANSWER = "Long Answer"
