import { OpenAIError, OpenAIStream } from '@/lib/server';

export const runtime = "edge";

function getRandomElement<T>(elements: T[]): T {
  const randomIndex = Math.floor(Math.random() * elements.length);
  return elements[randomIndex];
}

export async function POST(req: Request): Promise<Response> {
  try {
    const { description } = await req.json();

    console.log('Got question:');
    console.log(description);

    const systemPrompt = "You are a helpful assistant AI assistant.";

    const partn4 = ['stuck', 'confused', 'not sure how to move forward', 'uncertain', 'need help'];
    const partn3 = ['problem', 'task', 'question'];
    const partn2 = ['working', 'focusing', 'concetrating', 'putting all my energy'];
    const partn1 = ['developer', 'software engineer', 'engineer', 'dev', 'swe'];
    const part0 = ['As an expert software engineer,', 'As a software engineer specializing in algorithms', 'As a software engineer working at Meta,', 'As a software engineer working at Google,']
    const part1 = ['can you', 'might you', 'could you', 'please', 'kindly', 'I would really appreciate it if you could please', 'would really appreciate it if you could please', 'would be amazing if you can'];
    const part2 = ['assist me', 'help me', 'guide me', 'suggest to me how', 'recoomend how to'];
    const part3 = ['retrieve', 'find', 'discover', 'understand', 'think of', 'get to', 'arrive at', 'come to', 'think through'];
    const part4 = ['the most efficient', 'the fastest', 'the most optimal', 'the best'];
    const part5 = ['solve', 'find solution of', 'determine the solution of', 'figure out the solution of', 'accomplish', 'resolve', 'perform correctly'];

    const prompt = `I am a ${getRandomElement(partn1)} ${getRandomElement(partn2)} on the following ${getRandomElement(partn3)} (text extracted from screenshot) and I am ${getRandomElement(partn4)}:\n\n${description}\n\n${getRandomElement(part0)} ${getRandomElement(part1)} ${getRandomElement(part2)} ${getRandomElement(part3)} ${getRandomElement(part4)} algorithm to ${getRandomElement(part5)} the following problem? I am looking for the MOST efficient solution, I do not mind if it is a bit complex because I am prioritizing for efficiency. Think step by step each part of the solution and make sure to explain the algorithm you are using before writing down the solution. First, explain the problem and your thought process step by step. Then, write the algorithm in steps enumerating them from 1 to N for readability. You must write the solution in Python.`;
    console.log(prompt);
    const stream = await OpenAIStream(systemPrompt, prompt, 0, 'gpt-4-turbo-preview');

    return new Response(stream);
  } catch (error: any) {
    console.error(error);
    if (error instanceof OpenAIError) {
      return new Response('Error', { status: 500, statusText: error.message });
    } else {
      return new Response('Error', { status: 500 });
    }
  }
};
