
import { GoogleGenAI, Type } from "@google/genai";
import { PassportData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const PASSPORT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "Title (e.g., MR, MS, MRS, MASTER)",
    },
    firstName: {
      type: Type.STRING,
      description: "The first/given name of the passport holder (UPPERCASE)",
    },
    lastName: {
      type: Type.STRING,
      description: "The last/surname of the passport holder (UPPERCASE)",
    },
    passportNumber: {
      type: Type.STRING,
      description: "The unique passport number",
    },
    nationality: {
      type: Type.STRING,
      description: "Country of nationality",
    },
    gender: {
      type: Type.STRING,
      description: "Gender (MALE or FEMALE)",
    },
    dateOfBirth: {
      type: Type.STRING,
      description: "Date of birth in DD/MM/YYYY format",
    },
    issueDate: {
      type: Type.STRING,
      description: "Passport issue date in DD/MM/YYYY format",
    },
    expiryDate: {
      type: Type.STRING,
      description: "Passport expiry date in DD/MM/YYYY format",
    }
  },
  required: ["firstName", "lastName", "passportNumber"],
  propertyOrdering: ["title", "firstName", "lastName", "passportNumber", "nationality", "gender", "dateOfBirth", "issueDate", "expiryDate"],
};

export async function extractPassportDetails(file: File): Promise<Partial<PassportData>> {
  const base64Data = await fileToBase64(file);
  const mimeType = file.type || 'image/jpeg';

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { 
            text: `Extract passport details from this image for BESTEX TOURS AND TRAVELS. 
            MANDATORY: 
            1. Prioritize the Machine Readable Zone (MRZ) at the bottom for Passport Number and Name.
            2. Determine the Title (MR, MS, MRS) based on Gender and Names.
            3. Extract Gender (MALE/FEMALE).
            4. Extract all dates (DOB, Issue Date, Expiry Date) and format them as DD/MM/YYYY.
            5. Ensure names and nationality are in ALL CAPS.` 
          },
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: PASSPORT_SCHEMA,
      },
    });

    const result = JSON.parse(response.text || "{}");
    return {
      title: result.title?.toUpperCase(),
      firstName: result.firstName?.toUpperCase(),
      lastName: result.lastName?.toUpperCase(),
      passportNumber: result.passportNumber?.toUpperCase(),
      nationality: result.nationality?.toUpperCase(),
      gender: result.gender?.toUpperCase(),
      dateOfBirth: result.dateOfBirth,
      issueDate: result.issueDate,
      expiryDate: result.expiryDate,
    };
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("Unable to read passport. Improve image quality and re-upload.");
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}
