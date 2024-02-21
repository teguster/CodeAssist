export class OpenAIError extends Error {
    type: string;
    param: string;
    code: string;

    constructor(message: string, type: string, param: string, code: string) {
        super(message);
        this.name = 'OpenAIError';
        this.type = type;
        this.param = param;
        this.code = code;
    }
}

import {
    ParsedEvent,
    ReconnectInterval,
    createParser,
} from 'eventsource-parser';

interface PayLod {
    role: string,
    content: string | any,
};

export const OpenAIStream = async (
    systemPrompt: string,
    messagePrompt: string,
    temperature: number = 0,
    modelName: string = 'gpt-4-turbo-preview',
    image: string = '',
) => {
    console.log('Starting openai stream...');
    let url = 'https://api.openai.com/v1/chat/completions';
    console.log(systemPrompt);
    console.log(messagePrompt);

    const messages: Array<PayLod> = [
        {
            role: 'system',
            content: systemPrompt,
        },
        {
            role: 'user',
            content: messagePrompt,
        },
    ];

    console.log('Sending OpenAI API Request...');

    const res = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        method: 'POST',
        body: JSON.stringify({
            model: modelName,
            messages,
            max_tokens: 1000,
            temperature: temperature,
            stream: true,
        }),
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    if (res.status !== 200) {
        console.log('Error!');
        const result = await res.json();
        if (result.error) {
            throw new OpenAIError(
                result.error.message,
                result.error.type,
                result.error.param,
                result.error.code,
            );
        } else {
            throw new Error(
                `OpenAI API returned an error: ${decoder.decode(result?.value) || result.statusText
                }`,
            );
        }
    }

    const stream = new ReadableStream({
        async start(controller) {
            const onParse = (event: ParsedEvent | ReconnectInterval) => {
                if (event.type === 'event') {
                    const data = event.data;
                    // console.log(data);
                    if (data !== '[DONE]') {
                        try {
                            const json = JSON.parse(data);
                            if (json.choices[0].finish_reason != null) {
                                controller.close();
                                return;
                            }
                            const text = json.choices[0].delta.content;
                            const queue = encoder.encode(text);
                            controller.enqueue(queue);
                        } catch (e) {
                            controller.error(e);
                        }
                    }
                }
            };

            const parser = createParser(onParse);

            for await (const chunk of res.body as any) {
                parser.feed(decoder.decode(chunk));
            }
        },
    });

    return stream;
};
