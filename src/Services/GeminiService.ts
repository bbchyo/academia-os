import { message } from "antd"
import {
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
} from '@google/genai'
import { AcademicPaper } from "../Types/AcademicPaper"
import { ModelData } from "../Types/ModelData"
import { asyncForEach } from "../Helpers/asyncForEach"
import { asyncMap } from "../Helpers/asyncMap"

export class GeminiService {
  public static getGeminiKey = () => {
    return localStorage.getItem("geminiKey") || ""
  }

  public static handleError = (error: any) => {
    message.error(error.message || error?.response?.data?.message || error)
  }

  private static getGeminiClient() {
    return new GoogleGenAI({
      apiKey: GeminiService.getGeminiKey(),
    })
  }

  private static getGeminiConfig() {
    return {
      thinkingConfig: {
        thinkingBudget: -1,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
        },
      ],
      responseMimeType: 'text/plain',
    }
  }

  static async streamCompletion(prompt: string, callback: any) {
    try {
      const ai = GeminiService.getGeminiClient()
      const model = localStorage.getItem("geminiModel") || "gemini-2.5-flash"
      
      const contents = [
        {
          role: 'user',
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ]

      const response = await ai.models.generateContentStream({
        model,
        config: GeminiService.getGeminiConfig(),
        contents,
      })

      for await (const chunk of response) {
        if (chunk.text) {
          callback(chunk.text)
        }
      }
    } catch (error) {
      GeminiService.handleError(error)
    }
  }

  static async generateContent(prompt: string, systemPrompt?: string) {
    try {
      const ai = GeminiService.getGeminiClient()
      const model = localStorage.getItem("geminiModel") || "gemini-2.5-flash"
      
      const contents = [
        ...(systemPrompt ? [{
          role: 'user',
          parts: [
            {
              text: `System: ${systemPrompt}\n\nUser: ${prompt}`,
            },
          ],
        }] : [{
          role: 'user',
          parts: [
            {
              text: prompt,
            },
          ],
        }]),
      ]

      const response = await ai.models.generateContent({
        model,
        config: GeminiService.getGeminiConfig(),
        contents,
      })

      return response.response.text()
    } catch (error) {
      GeminiService.handleError(error)
      return ""
    }
  }

  static async getDetailAboutPaper(paper: AcademicPaper, detail: string) {
    try {
      let fullText = paper?.fullText

      if ((fullText?.length || 0) > 0) {
        const systemPrompt = "You extract information from a paper. Answer the question shortly and concisely in only one or few words about the given abstract, no need for full sentences. Only reply with the answer. Does not have to be perfect, but if you don't have a somewhat acceptable answer, reply 'n/a'."
        
        const userPrompt = `${paper?.title}\n${fullText}\n\nDescribe the '${detail}' of the given paper.`
        
        const result = await GeminiService.generateContent(userPrompt, systemPrompt)
        return (result === detail ? "n/a" : result) as string
      }
      return ""
    } catch (error) {
      GeminiService.handleError(error)
      return ""
    }
  }

  static async findTentativeResearchQuestions(
    papers: AcademicPaper[]
  ): Promise<string[]> {
    try {
      if ((papers?.length || 0) > 0) {
        const systemPrompt = `You are provided with a list of paper titles and you are tasked to find research questions that might be answered developing a new theoretical model. Return a JSON-object with an array of strings, each representing a potential research question in the following format: {"research_questions": string[]}. Return only a JSON array of strings, no additional text.`
        
        const userPrompt = `${papers
          .map((paper) => `- ${paper?.title}`)
          .join(
            "\n"
          )}\n\nNow, provide an array of 5 potential research questions.`

        const result = await GeminiService.generateContent(userPrompt, systemPrompt)
        
        try {
          const codes = result
            ? JSON.parse(result?.replace(/\\n/g, " "))?.research_questions
            : []
          return codes
        } catch (error) {
          console.log(error)
        }
      }
      return []
    } catch (error) {
      GeminiService.handleError(error)
      return []
    }
  }

  static async initialCodingOfPaper(paper: AcademicPaper, remarks?: string) {
    try {
      let fullText = paper?.fullText
      let initialCodesArray = [] as string[]

      if ((paper?.fullText?.length || 0) > 5000) {
        // For large texts, we'll process in chunks
        const chunkSize = 10000
        const chunks = []
        for (let i = 0; i < fullText!.length; i += chunkSize) {
          chunks.push({
            pageContent: fullText!.substring(i, i + chunkSize)
          })
        }

        await asyncForEach(chunks, async (chunk, index) => {
          console.log(`Processing chunk ${index + 1} of ${chunks.length}`)
          
          const systemPrompt = 'You are tasked with applying the initial coding phase of the Gioia method to the provided academic paper. In this phase, scrutinize the text to identify emergent themes, concepts, or patterns. Your output should be a JSON object with an array of strings no longer than 7 words, each representing a distinct initial code in the language of the raw source. For example, your output should be in this format: {"codes": string[]}. Ensure to return ONLY a proper JSON array of strings.'
          
          const userPrompt = `${paper?.title}\n${chunk.pageContent}\n\nPerform initial coding according to the Gioia method on the given paper.${
            remarks ? ` Remark: ${remarks}. ` : ""
          } Return a JSON object.`

          const result = await GeminiService.generateContent(userPrompt, systemPrompt)

          try {
            const codes = result
              ? JSON.parse(result?.replace(/\\n/g, " "))?.codes
              : []
            initialCodesArray.push(...codes)
          } catch (error) {
            console.log(error, result)
          }
        })
      } else {
        const systemPrompt = 'You are tasked with applying the initial coding phase of the Gioia method to the provided academic paper. In this phase, scrutinize the text to identify emergent themes, concepts, or patterns. Your output should be a JSON object with an array of strings no longer than 7 words, each representing a distinct initial code in the language of the raw source. For example, your output should be in this format: {"codes": string[]}. Ensure to return ONLY a proper JSON array of strings.'
        
        const userPrompt = `${paper?.title}\n${fullText}\n\nPerform initial coding according to the Gioia method on the given paper.${
          remarks ? ` Remark: ${remarks}. ` : ""
        } Return a JSON object.`

        const result = await GeminiService.generateContent(userPrompt, systemPrompt)

        try {
          const codes = result
            ? JSON.parse(result?.replace(/\\n/g, " "))?.codes
            : []
          initialCodesArray.push(...codes)
        } catch (error) {
          console.log(error, result)
        }
      }

      return initialCodesArray
    } catch (error) {
      GeminiService.handleError(error)
      return []
    }
  }

  static async secondOrderCoding(codesArray: string[]) {
    try {
      const jsonString = JSON.stringify(codesArray)
      const secondOrderCodes = {} as any

      const systemPrompt = 'You are tasked with applying the 2nd Order Coding phase of the Gioia method. In this phase, identify higher-level themes or categories that aggregate the initial codes. Your output should be a JSON-formatted object mapping each higher-level theme to an array of initial codes that belong to it. As a general example, "employee sentiment" could be a 2nd order code to 1st level codes "Positive feelings toward new policy" and "Sense of control" Your output should look like this, where the keys are the higher-level concepts: {"Some higher-Level theme": ["some initial code", "another initial code"], "Another higher-level theme": ["some initial code"]}.'
      
      const userPrompt = `Part of the initial codes are as follows: ${jsonString}\n\nPerform 2nd Order Coding according to the Gioia method and return a JSON object of 12 focus codes.`

      const result = await GeminiService.generateContent(userPrompt, systemPrompt)
      
      try {
        const newSecondOrderCodes = result
          ? JSON.parse(result?.replace(/\\n/g, " "))
          : {}
        Object.assign(secondOrderCodes, newSecondOrderCodes)
      } catch (error) {
        console.log(error)
      }

      return secondOrderCodes
    } catch (error) {
      GeminiService.handleError(error)
      return {}
    }
  }

  static async aggregateDimensions(secondOrderCodes: Record<string, string[]>) {
    try {
      const jsonString = JSON.stringify(Object.keys(secondOrderCodes))

      const systemPrompt = 'You are tasked with applying the Aggregate Dimensions phase of the Gioia method. In this phase, identify overarching theoretical dimensions (5-7) that aggregate the 2nd order codes. Your output should be a JSON-formatted object mapping each aggregate dimension to an array of 2nd order codes that belong to it. As a (probably unrelated) general example, "Policy Usability" could make for a good, quantifiable dimension. Your output should look like this, where the keys are the (quantifiable) dimensions: {"some dim": ["theme", "another theme"], "another dim": ["theme123"]}. Ensure that the aggregate dimensions are grounded in the themes and to return ONLY a proper JSON object.'
      
      const userPrompt = `The 2nd order codes are as follows: ${jsonString}\n\nPerform aggregation into theoretical dimensions according to the Gioia method and return a JSON object.`

      const result = await GeminiService.generateContent(userPrompt, systemPrompt)

      try {
        const aggregateDimensions = result
          ? JSON.parse(result?.replace(/\\n/g, " "))
          : {}
        return aggregateDimensions
      } catch (error) {
        console.log(error)
        return {}
      }
    } catch (error) {
      GeminiService.handleError(error)
      return {}
    }
  }

  static async brainstormApplicableTheories(
    aggregateDimensions: Record<string, string[]>
  ) {
    try {
      const jsonString = JSON.stringify(aggregateDimensions)

      const systemPrompt = `Your task is to brainstorm theoretical models from existing literature that could be applicable to the research findings. Each theory should be well-defined and should relate to one or more aggregate dimensions. The output should be a JSON-object with an array following this schema: 
      {"theories": {"theory": string, "description": string, "relatedDimensions": string[], "possibleResearchQuestions": string[]}[]}`
      
      const userPrompt = `Our research aims to understand specific phenomena within a given context. We have identified multiple aggregate dimensions and second-order codes that emerged from our data. Could you suggest theories that could help explain these dimensions and codes? The aggregate dimensions and codes are as follows: ${jsonString}`

      const result = await GeminiService.generateContent(userPrompt, systemPrompt)

      try {
        const applicableTheories = result
          ? JSON.parse(result?.replace(/\\n/g, " "))?.theories
          : []
        return applicableTheories
      } catch (error) {
        console.log(error)
        return []
      }
    } catch (error) {
      GeminiService.handleError(error)
      return []
    }
  }

  static async conceptTuples(modelData: ModelData): Promise<[string, string][]> {
    try {
      const jsonString = JSON.stringify(modelData?.aggregateDimensions)

      const systemPrompt = `Your task is to hypothesize which concepts could be related to each other. Return a JSON-object with an array of tuple arrays, where each tuple array represents a possible relationship between two concepts. The output should be a JSON-formatted array following this schema: {"tuples": [[string, string], [string, string], ...]}. E.g. {"tuples": [["Knowledge Management", "Organizational Performance"]]}. This allows us to in the next step research the relationship between the concepts in the literature.`
      
      const userPrompt = `Our research aims to understand ${
        modelData.query || "specific phenomena within a given context"
      }.${
        modelData.remarks ? `Remarks: ${modelData.remarks}.` : ""
      } We have identified multiple aggregate dimensions and second-order codes that emerged from our data.
      ${jsonString}
      Now, hypothesize which concepts could be related to each other and return only the JSON-formatted array of 10 - 20 tuples.`

      const result = await GeminiService.generateContent(userPrompt, systemPrompt)

      try {
        const conceptTuples = result
          ? JSON.parse(result?.replace(/\\n/g, " "))?.tuples
          : []
        return conceptTuples
      } catch (error) {
        console.log(error)
        return []
      }
    } catch (error) {
      GeminiService.handleError(error)
      return []
    }
  }

  static async modelConstruction(modelData: ModelData, modelingRemarks: string) {
    try {
      const jsonString = JSON.stringify(modelData.aggregateDimensions)

      const systemPrompt = `You are a qualitative researcher tasked with constructing a theoretical model from existing literature that could be applicable to the research findings. The model should be well-defined and should relate to one or more aggregate dimensions. It should be novel and original. You can build on existing theories, however, you should introduce new ideas. Emphasize the relationships between the dimensions and the model. Explain how the relationships might be causal or correlational, be clear on the narrative. You are non-conversational and should not respond to the user, but give a general description of model. Give a name to the model.`
      
      const userPrompt = `${
        modelData?.critique && modelData?.modelDescription
          ? `Previous model: ${modelData?.modelDescription}\nCritique: ${modelData?.critique}\n\n`
          : ""
      }Relevant existing theories: ${modelData.applicableTheories
        ?.map((theory) => theory?.description || JSON.stringify(theory))
        ?.join(", ")}
      \n\n
      The aggregate dimensions and codes are as follows: ${jsonString}${
        modelingRemarks ? ` Remarks: ${modelingRemarks}` : ""
      }\n\n${modelData.interrelationships
        ?.map(
          (interrelationship) =>
            `${interrelationship?.concepts?.join(" - ")}: ${
              interrelationship?.interrelationship
            }`
        )
        .join(
          "\n"
        )}\n\nNow, construct an extensive, comprehensive, new, theoretical model.`

      const result = await GeminiService.generateContent(userPrompt, systemPrompt)
      return result
    } catch (error) {
      GeminiService.handleError(error)
      return ""
    }
  }

  static async extractModelName(modelDescription: string) {
    try {
      const systemPrompt = `You extract theoretical model names. If none given, invent an original one. You only reply with the name, nothing else.`
      const userPrompt = `${modelDescription}\n\nNow, return the model name`

      const result = await GeminiService.generateContent(userPrompt, systemPrompt)
      return result
    } catch (error) {
      GeminiService.handleError(error)
      return ""
    }
  }

  static async critiqueModel(modelData: ModelData) {
    try {
      const systemPrompt = `You are a qualitative researcher tasked with critiquing a theoretical model. Offer your comments on novelty, conciseness, clarity and theoretical insight and brainstorm potential new patterns to discover in the data. You are non-conversational and should not respond to the user, only return the critique, nothing else.`
      
      const userPrompt = `${
        (modelData?.firstOrderCodes?.length || 0) < 50
          ? `First order codes: ${modelData?.firstOrderCodes?.join(", ")}`
          : ""
      }
      ${JSON.stringify(modelData?.interrelationships)}
      \n\n
      Model: ${modelData?.modelName}\n
      ${modelData?.modelDescription}
      Now, return your critique`

      const result = await GeminiService.generateContent(userPrompt, systemPrompt)
      return result
    } catch (error) {
      GeminiService.handleError(error)
      return ""
    }
  }

  static async modelVisualization(modelData: ModelData) {
    try {
      const systemPrompt = `You are a qualitative researcher tasked with visualizing a theoretical model with MermaidJS. Example:
      
      flowchart TD
        %% Nodes
        A[Organizational Culture<br>'evidence 1'<br>'evidence2']
        B[Leadership Style]
        C[Employee Satisfaction]
        D[Employee Productivity]
        E[Customer Satisfaction]
        F[Financial Performance]

        %% Relationships
        A --> B
        B ==>|Directly Influences<br>'evidence 3'| C
        A -.->|Moderates| C
        C --> D
        D -->|Impacts| E
        E --- F
        C -.->|Partially Mediates| F
        

      As we have seen in above diagram, ==> is used to indicate a strong direct influence, --> is used to indicate a weaker influence, -.-> is used to indicate a moderating relationship, and --- is used to indicate a correlation.
      Evidence can be cited by adding a line break and then the evidence in single quotes. Use first-order codes or second-order codes as evidence only, preferably not as their own nodes.
      Now, given a model description, you should generate a MermaidJS diagram like the one above, showing the interrelationship between different concepts. Keep it simple and effective. You are non-conversational and should not respond to the user, only return the MermaidJS code, nothing else.`
      
      const userPrompt = `${
        (modelData?.firstOrderCodes?.length || 0) > 200
          ? `Second-order codes: ${Object.keys(
              modelData?.secondOrderCodes || {}
            )?.join(", ")}`
          : `First-order codes: ${modelData?.firstOrderCodes?.join(", ")}`
      }\n\n${modelData.modelDescription}${
        modelData.remarks ? `\n\nRemarks: ${modelData.remarks}` : ""
      }`

      const result = await GeminiService.generateContent(userPrompt, systemPrompt)

      if (result) {
        let normalizedContent = result

        const startIndex = normalizedContent.indexOf("flowchart ")
        if (startIndex !== -1) {
          normalizedContent = normalizedContent.substring(startIndex)
        }

        normalizedContent = normalizedContent.replace(/```/g, "").trim()
        return normalizedContent
      } else {
        return ""
      }
    } catch (error) {
      GeminiService.handleError(error)
      return ""
    }
  }
}