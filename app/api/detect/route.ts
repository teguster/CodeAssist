import Replicate from "replicate";

export const runtime = "edge";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

function removeLeadingNonAlphanumeric(str: string): string {
  return str.replace(/^\W+/, '');
}

export async function POST(req: Request): Promise<Response> {
  try {
    const { imageText } = await req.json();

    console.log(imageText);

    const systemPrompt = `You are a helpful assistant.`;
    const messagePrompt = `Given the text extracted from a website: \n\n${imageText}\n\nYou must determine if there is a coding task present in the task. If there is a coding task, you must responde with yes and you must rrespond with no otherwise. If there is a coding task, you must describe it. You must write 3-4 sentences max.`;

    const input = {
      top_k: 50,
      top_p: 0.9,
      prompt: systemPrompt + "/n/n" + messagePrompt,
      temperature: 0,
      max_new_tokens: 512,
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
    const responseContainsProblem = problemKeywords.some(keyword => lowerCaseResult.includes(keyword));

    const finalResponse = responseContainsProblem ? "PROBLEM_FOUND" : "NO_PROBLEM";

    console.log(`Response contains problem: ${responseContainsProblem}`);

    // Structure the response to include both the indicator and the description
    const apiResponse = {
      problemFound: finalResponse,
      description: responseContainsProblem ? lowerCaseResult : '',
    };

    return new Response(JSON.stringify(apiResponse), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error(error);
    return new Response('Error', { status: 500 });
  }
};
