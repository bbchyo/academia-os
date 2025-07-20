import { OpenAIService } from "./OpenAIService"
import { GeminiService } from "./GeminiService"
import { AcademicPaper } from "../Types/AcademicPaper"
import { ModelData } from "../Types/ModelData"

export class AIService {
  private static getSelectedProvider(): 'openai' | 'gemini' {
    return localStorage.getItem("aiProvider") as 'openai' | 'gemini' || 'openai'
  }

  public static hasValidAPIKey(): boolean {
    const provider = AIService.getSelectedProvider()
    if (provider === 'openai') {
      return !!OpenAIService.getOpenAIKey()
    } else {
      return !!GeminiService.getGeminiKey()
    }
  }

  static async streamCompletion(prompt: string, callback: any) {
    const provider = AIService.getSelectedProvider()
    if (provider === 'openai') {
      return OpenAIService.streamCompletion(prompt, callback)
    } else {
      return GeminiService.streamCompletion(prompt, callback)
    }
  }

  static async getDetailAboutPaper(paper: AcademicPaper, detail: string) {
    const provider = AIService.getSelectedProvider()
    if (provider === 'openai') {
      return OpenAIService.getDetailAboutPaper(paper, detail)
    } else {
      return GeminiService.getDetailAboutPaper(paper, detail)
    }
  }

  static async findTentativeResearchQuestions(papers: AcademicPaper[]): Promise<string[]> {
    const provider = AIService.getSelectedProvider()
    if (provider === 'openai') {
      return OpenAIService.findTentativeResearchQuestions(papers)
    } else {
      return GeminiService.findTentativeResearchQuestions(papers)
    }
  }

  static async initialCodingOfPaper(paper: AcademicPaper, remarks?: string) {
    const provider = AIService.getSelectedProvider()
    if (provider === 'openai') {
      return OpenAIService.initialCodingOfPaper(paper, remarks)
    } else {
      return GeminiService.initialCodingOfPaper(paper, remarks)
    }
  }

  static async secondOrderCoding(codesArray: string[]) {
    const provider = AIService.getSelectedProvider()
    if (provider === 'openai') {
      return OpenAIService.secondOrderCoding(codesArray)
    } else {
      return GeminiService.secondOrderCoding(codesArray)
    }
  }

  static async aggregateDimensions(secondOrderCodes: Record<string, string[]>) {
    const provider = AIService.getSelectedProvider()
    if (provider === 'openai') {
      return OpenAIService.aggregateDimensions(secondOrderCodes)
    } else {
      return GeminiService.aggregateDimensions(secondOrderCodes)
    }
  }

  static async brainstormApplicableTheories(aggregateDimensions: Record<string, string[]>) {
    const provider = AIService.getSelectedProvider()
    if (provider === 'openai') {
      return OpenAIService.brainstormApplicableTheories(aggregateDimensions)
    } else {
      return GeminiService.brainstormApplicableTheories(aggregateDimensions)
    }
  }

  static async conceptTuples(modelData: ModelData): Promise<[string, string][]> {
    const provider = AIService.getSelectedProvider()
    if (provider === 'openai') {
      return OpenAIService.conceptTuples(modelData)
    } else {
      return GeminiService.conceptTuples(modelData)
    }
  }

  static async findRelevantParagraphsAndSummarize(
    modelData: ModelData,
    conceptTuples: [string, string][]
  ) {
    const provider = AIService.getSelectedProvider()
    if (provider === 'openai') {
      return OpenAIService.findRelevantParagraphsAndSummarize(modelData, conceptTuples)
    } else {
      // For Gemini, we'll use a simplified approach since it doesn't have vector search
      return []
    }
  }

  static async modelConstruction(modelData: ModelData, modelingRemarks: string) {
    const provider = AIService.getSelectedProvider()
    if (provider === 'openai') {
      return OpenAIService.modelConstruction(modelData, modelingRemarks)
    } else {
      return GeminiService.modelConstruction(modelData, modelingRemarks)
    }
  }

  static async extractModelName(modelDescription: string) {
    const provider = AIService.getSelectedProvider()
    if (provider === 'openai') {
      return OpenAIService.extractModelName(modelDescription)
    } else {
      return GeminiService.extractModelName(modelDescription)
    }
  }

  static async critiqueModel(modelData: ModelData) {
    const provider = AIService.getSelectedProvider()
    if (provider === 'openai') {
      return OpenAIService.critiqueModel(modelData)
    } else {
      return GeminiService.critiqueModel(modelData)
    }
  }

  static async modelVisualization(modelData: ModelData) {
    const provider = AIService.getSelectedProvider()
    if (provider === 'openai') {
      return OpenAIService.modelVisualization(modelData)
    } else {
      return GeminiService.modelVisualization(modelData)
    }
  }
}