import Replicate from "replicate";

export const runtime = "edge";

function removeLeadingNonAlphanumeric(str: string): string {
  return str.replace(/^\W+/, '');
}

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(req: Request): Promise<Response> {
  try {
    const { extractedText, description } = await req.json();

    const systemPrompt = `You are a helpful assistant of a lightweight LLM to reduce computatoons from a heavweight LLM. To avoid making requests to the heavyweight LLM, we want to eliminate duplicate requests. We have an exisiting already solved coding task and a new task extracted through OCR.  We need to determine if the tasks refer to the same task in which case we can reuse the existing results of the heavyweight LLM instead of computing them again. If the new text extracted from the website using OCR has additional tasks or sub-tasks that are not present in the previous coding task already solved, that counts as the tasks being different.`;
    const messagePrompt = `Determine whether the following two texts describe the same coding task:

Extracted Text from website using OCR:
${extractedText}

Previous Coding Task Already Solved:
${description}

You must respond starting with "yes" if this is the same coding task and "no" otherwise. You MUST only use five words or less.`;

    const input = {
      top_k: 50,
      top_p: 0.9,
      prompt: systemPrompt + "/n/n" + messagePrompt,
      temperature: 0,
      max_new_tokens: 50,
      prompt_template: "<s>[INST] {prompt} [/INST] ",
      presence_penalty: 0,
      frequency_penalty: 0
    };

    const output = await replicate.run("mistralai/mixtral-8x7b-instruct-v0.1", { input });

    // Convert the response to lower case
    const result = output as string[];
    const lowerCaseResult = removeLeadingNonAlphanumeric(result.join('').toLowerCase());
    console.log('Result obtained!');
    console.log(lowerCaseResult);

    // Check if the response indicates a problem
    const problemKeywords = ["yes", "Yes", "yeah", "Yeah", "Of course", "of course"];
    const responseIsSameProblem = problemKeywords.some(keyword => lowerCaseResult.includes(keyword));

    const validateResult = responseIsSameProblem ? "SAME_PROBLEM" : "NOT_SAME_PROBLEM";

    console.log(`'It is the same problem: ${responseIsSameProblem}`);

    return new Response(validateResult);
  } catch (error: any) {
    console.error(error);
    return new Response('Error', { status: 500 });
  }
};
