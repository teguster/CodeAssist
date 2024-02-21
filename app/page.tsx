'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Card as QuestionCard, CardHeader as QuestionCardHeader, CardContent as QuestionCardContent } from "@/components/ui/questionCard";

import React, { useState, useEffect, useRef } from "react";
import Tesseract from 'tesseract.js';
import Header from '../components/ui/Header';
import Footer from '../components/ui/Footer';

let screenTrack: MediaStreamTrack | null = null; // Global variable to keep track of the screen sharing track

const replacements: any = {
  "interview": "meeting",
  "challenge": "meeting",
  "leetcode": '<SOME_COMPANY_NAME>',
  "codility": '<SOME_COMPANY_NAME>',
  "codesignal": '<SOME_COMPANY_NAME>',
  "hackerrank": "<SOME_COMPANY_NAME>",
  "adaface": "<SOME_COMPANY_NAME>",
  "coderbyte": "<SOME_COMPANY_NAME>",
  "codebyte": "<SOME_COMPANY_NAME>",
  "testgorilla": "<SOME_COMPANY_NAME>",
  "test": "task",
  "assignment": "task",
  "assessment": "task",
  "technical screen": "task",
  "coding": "work",
  "screen": "dislay",
};

export default function LandingPage() {
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [aiContent, setAiContent] = useState('');
  const contentRef = useRef<HTMLDivElement>(null); // Explicitly define the type of ref
  let lastDescription: string | undefined = undefined;
  let lastWebsiteContent: string | undefined = undefined;

  // Automatically scroll to the bottom of the content area when aiContent changes
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [aiContent]);

  // Function to append text to aiContent
  const appendToAiContent = (text: string) => {
    setAiContent(prevContent => prevContent + text);
  };

  const updateLastTextArea = (newText: string) => {
    setAiContent(prevContent => {
      // Split the previous content by double newline
      const parts = prevContent.split("\n");

      // Replace the last part with the new text
      parts[parts.length - 1] = newText;

      // Join the parts back together with double newline
      return parts.join("\n");
    });
  };

  const processStream = async (reader: ReadableStreamDefaultReader<string>) => {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log('Stream complete');
        break;
      }

      // Convert Uint8Array to string
      console.log('value:');
      console.log(value);
      // Append the converted string to the UI
      appendToAiContent(value);
    }
  };

  const requestScreenPermission = async (): Promise<void> => {
    console.log('requested screen permission');
    setAiContent('Waiting for AI content...');
    try {
      setIsScreenSharing(true);

      const screenStream: MediaStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenTrack = screenStream.getVideoTracks()[0];

      if (!screenTrack) {
        setIsScreenSharing(false);
        throw new Error("No video track available");
      }

      // Create a hidden video element
      const videoElement = document.createElement('video');
      videoElement.style.display = 'none';
      videoElement.srcObject = screenStream;
      document.body.appendChild(videoElement);
      videoElement.play();

      const worker = await Tesseract.createWorker('eng');

      let isProcessing: boolean = false;

      // Create a canvas element
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const convertVideoElementToCanvas = (
        videoElement: HTMLVideoElement,
        canvas: HTMLCanvasElement,
        ctx: CanvasRenderingContext2D | null,
      ) => {
        if (!ctx) {
          console.log('Error: Context not found');
          return;
        }

        if (videoElement.readyState !== videoElement.HAVE_ENOUGH_DATA) {
          console.log('Error: Video element does not have enough data');
          return;
        }

        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        ctx.drawImage(videoElement, 0, 0);
      };

      const extractText = async (canvas: HTMLCanvasElement): Promise<string> => {
        let result = '';
        try {
          console.log('Recognizing image...');
          if (!worker) {
            console.log('No worker found!!');
            return result;
          }
          const imageTextObject = await worker.recognize(canvas);
          console.log("Recognized Text: ", imageTextObject.data.text);
          result = imageTextObject.data.text;
        } catch (error) {
          console.error("OCR processing error: ", error as Error);
        }

        return result;
      };

      const callApi = async (url: string, body: any, isJsonResponse = true, isStream = false) => {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        if (isStream && response.body) {
          const reader = response.body.getReader();
          return new ReadableStream({
            async start(controller) {
              while (true) {
                const { done, value } = await reader.read();
                if (done) {
                  break;
                }
                // Assuming the stream chunks are text
                controller.enqueue(new TextDecoder().decode(value));
              }
              controller.close();
              reader.releaseLock();
            }
          });
        } else {
          return isJsonResponse ? response.json() : response.text();
        }
      };

      const similarityCheck = (str1: string, str2: string, threshold = 0.95) => {
        const words1 = new Set(str1.split(/\s+/));
        const words2 = new Set(str2.split(/\s+/));
        console.log('####################################');
        console.log('Words of previous screen content:');
        console.log('####################################');
        console.log(words1);
        console.log('####################################');
        console.log('Words of current screen content:');
        console.log('####################################');
        console.log(words2);

        const union = new Set([...words1, ...words2]);

        let commonCount = 0;

        words1.forEach(word => {
          if (words2.has(word)) {
            commonCount++;
          }
        });

        console.log('####################################');
        console.log('New words in current screen content:');
        console.log('####################################');
        words2.forEach(word => {
          if (!words1.has(word)) {
            console.log(word);
          }
        });

        console.log(`Same word count: ${commonCount}`);
        console.log(`Union size count: ${union.size}`);

        const similarity = commonCount / union.size;
        console.log(`similarity ration: ${similarity}`);

        return similarity >= threshold;
      };

      const captureAndProcessImage = async (): Promise<void> => {
        try {
          if (!isProcessing) {
            const startTime = performance.now();
            console.log(`Start time: ${startTime}`)
            isProcessing = true;

            await convertVideoElementToCanvas(videoElement, canvas, ctx);
            const imageText = await extractText(canvas);

            // Check if screen content has changed
            if (lastWebsiteContent && (lastWebsiteContent === imageText || similarityCheck(lastWebsiteContent, imageText))) {
              isProcessing = false;
              updateLastTextArea('No significant changes detected in screen. Waiting for changes...');
              return;
            }

            // Call the /api/detect/ endpoint with the extracted text
            console.log('Calling detect API!');
            const detectResultJson = await callApi('/api/detect/', { imageText });

            // Check if problem is found and call /api/validate/ if so
            if (detectResultJson.problemFound !== 'PROBLEM_FOUND') {
              isProcessing = false;
              lastDescription = detectResultJson.description;
              lastWebsiteContent = imageText;
              updateLastTextArea('No coding task detected. Looking for a task...');
              return;
            }

            if (lastDescription && (lastDescription === detectResultJson.description || similarityCheck(lastDescription, detectResultJson.description))) {
              isProcessing = false;
              updateLastTextArea('Coding task already solved based on text similarity. Trying to detect new task...');
              return;
            }

            console.log('Calling validate API!');
            const validateResult = await callApi('/api/validate/',
              { extractedText: detectResultJson.description, description: lastDescription }, false);

            if (lastDescription && validateResult === 'SAME_PROBLEM') {
              isProcessing = false;
              updateLastTextArea('Detected task already solved based on text meaning. Trying to detect new task...');
              return;
            }

            // Now send this base64Image to the API
            updateLastTextArea('Found problem! Working on solution...');
            // console.log('Getting question...');
            const regex = new RegExp(Object.keys(replacements).join("|"), "gi");
            const sanitizedText = imageText.replace(regex, matched => replacements[matched.toLowerCase()]);
            console.log('Sending question to AI for solution...');
            const solveStream = await callApi('/api/solve/', { description: sanitizedText }, false, true);

            const reader = solveStream.getReader();
            appendToAiContent('\n');
            const endTime = performance.now();
            console.log(`End time: ${endTime}`);
            console.log(`Time difference: ${endTime - startTime}`);

            await processStream(reader);
            appendToAiContent('\nCoding problem detected and solved. See above.');
            lastDescription = detectResultJson.description;
            lastWebsiteContent = imageText;

            isProcessing = false;
          }
        } catch (error) {
          console.error("Error in capture and process image: ", error);
          isProcessing = false;
        }
      };

      let captureInterval: number = window.setInterval(() => {
        captureAndProcessImage();
      }, 2000);

      // Event listener for when the user stops sharing the screen
      screenTrack.addEventListener('ended', () => {
        console.log("Screen sharing stopped - 'ended' event triggered");
        clearInterval(captureInterval); // Stop the interval
        worker.terminate(); // Terminate the Tesseract worker
        captureInterval = -1; // Clear the interval ID
        setIsScreenSharing(false);
        console.log("Track readyState:", screenTrack?.readyState);
        console.log("Track muted state:", screenTrack?.muted);
      });

      screenTrack.onmute = () => {
        console.log("Screen sharing muted - 'onmute' event triggered");
        // Consider not stopping the screen sharing automatically on 'onmute'
        console.log("Track readyState:", screenTrack?.readyState);
        console.log("Track muted state:", screenTrack?.muted);
      };

    } catch (error: any) {
      console.error("Error requesting screen permission: ", error as Error);

      // Check if the error is due to the user canceling the screen share prompt
      if (error.name === "AbortError" || error.name === "NotAllowedError") {
        console.log("Screen sharing was canceled by the user.");
      }

      // Reset any state as necessary
      setIsScreenSharing(false);
    }
  };

  const stopScreenSharing = () => {
    console.log("Attempting to stop screen sharing");

    if (screenTrack) {
      screenTrack.stop();
      console.log("Screen track stopped");
    }

    // This should trigger a re-render
    setIsScreenSharing(false);

    // Additional cleanup if necessary
  };

  const handleStartSession = async () => {
    await requestScreenPermission();
  };

  return (
    <div className="flex flex-col min-h-screen bg-white w-full">
      <Header />
      {isScreenSharing ? (
        <main className="card flex-grow bg-[#ffffff] p-4 overflow-auto text-black">
          <div className="flex justify-between items-start mb-4">
            {/* Title */}
            <h4 className="text-3xl font-bold text-center text-gray-900">CheatCode AI Coding Solutions</h4>

            {/* Button aligned to the right */}
            <Button
              className="bg-red-500 text-white px-4 py-2 rounded rounded-md hover:bg-black transition-colors duration-300"
              onClick={stopScreenSharing}>
              Cancel Screen Sharing
            </Button>
          </div>
          <Card>
            <div
              className="pt-0 overflow-auto" // Add overflow-auto for scrolling
              style={{
                width: '100%', // Set an explicit width
                maxWidth: '2500px', // Adjust as needed
                wordBreak: 'break-word', // Ensures words are broken correctly
                whiteSpace: 'pre-wrap',   // Wraps text as necessary and on line breaks
              }} // Set a fixed height and ensure text wrapping
              ref={contentRef} // Attçach the ref to the div
            >
              <CardContent className="pl-1 ml-0">
                <span className="text-sm pl-1 pt-1">
                  {aiContent || 'Waiting for AI generations...'}
                </span>
              </CardContent>
            </div>
          </Card>
        </main>
      ) : (
        <main className="flex flex-col flex-grow items-center justify-center space-y-6 py-20 h-screen">
          <h2 className="text-4xl font-bold text-center text-gray-900">
            Never get stuck on a coding problem again!
          </h2>
          <p className="text-xl text-center text-gray-600 max-w-xl">
            Start a collaborative AI problem solving session to instantly find the solution for any problem
          </p>
          <Button
            className="bg-blue-600 text-white px-9 py-4 rounded-md hover:bg-black transition-colors duration-300"
            onClick={handleStartSession}>
            Start Session
          </Button>
        </main>
      )}
      {!isScreenSharing &&
        <div>
          <section id="howToUse" className="flex flex-col items-center justify-center space-y-6 py-20">
            <h2 className="text-4xl font-bold text-center text-gray-900">How to use CheatCode?</h2>
            <div className="w-full max-w-2xl">
              <QuestionCard>
                <QuestionCardHeader>
                  <h3 className="text-lg font-bold text-gray-900">Step 1: Split Screen</h3>
                </QuestionCardHeader>
                <QuestionCardContent>
                  <p className="text-gray-600">
                    Split your screen in half with left half the window with CheatCode and right half the window in which you are working on coding tasks.
                  </p>
                  <img
                    src="/static/split_screen.png" // Replace with your image path or URL
                    alt="Description of Image"
                    className="w-full h-auto" // Adjust width and height as needed
                    width={2880} // Estimated width
                    height={1762} // Estimated height}
                  >
                  </img>
                </QuestionCardContent>
              </QuestionCard>
              <QuestionCard>
                <QuestionCardHeader>
                  <h3 className="text-lg font-bold text-gray-900">Step 2: Start Session</h3>
                </QuestionCardHeader>
                <QuestionCardContent>
                  <p className="text-gray-600">
                    Start session and share the right screen so that CheatCode can automatically detect coding problems and present solutions.
                  </p>
                  <img
                    src="/static/sharescreen.png" // Replace with your image path or URL
                    alt="Description of Image"
                    className="w-full h-auto" // Adjust width and height as needed
                    width={2880} // Estimated width
                    height={1760} // Estimated height}
                  />
                </QuestionCardContent>
              </QuestionCard>
              <QuestionCard>
                <QuestionCardHeader>
                  <h3 className="text-lg font-bold text-gray-900">Step 3: CheatCode Shows Solutions</h3>
                </QuestionCardHeader>
                <QuestionCardContent>
                  <p className="text-gray-600">
                    CheatCode AI automatically detects coding problems from the right screen and displays insights, algorithms for solutions, and code solutions in Python.
                  </p>
                  <img
                    src="/static/generationscreen.png" // Replace with your image path or URL
                    alt="Description of Image"
                    className="w-full h-auto" // Adjust width and height as needed
                    width={2880} // Estimated width
                    height={1764} // Estimated height}
                  />
                </QuestionCardContent>
              </QuestionCard>
            </div>
          </section>
          <section id="faq" className="flex flex-col items-center justify-center space-y-6 py-20">
            <h2 className="text-4xl font-bold text-center text-gray-900">Frequently Asked Questions</h2>
            <div className="w-full max-w-2xl">
              <QuestionCard>
                <QuestionCardHeader>
                  <h3 className="text-lg font-bold text-gray-900">What is CheatCode?</h3>
                </QuestionCardHeader>
                <QuestionCardContent>
                  <p className="text-gray-600">
                    CheatCode is an AI-powered tool designed to assist software engineers with side projects by transcribing and analyzing content from screen shares to provide real-time recommendations.
                  </p>
                </QuestionCardContent>
              </QuestionCard>
              <QuestionCard>
                <QuestionCardHeader>
                  <h3 className="text-lg font-bold text-gray-900">How to use CheatCode?</h3>
                </QuestionCardHeader>
                <QuestionCardContent>
                  <ul className="text-gray-600">
                    <li>Open two windows and position them half and half on your screen </li>
                    <li> Navigate to CheatCode on left window and navigate to document where you are working on tasks on right window</li>
                    <li> Click on Start Session button and share screen of right window with CheatCode</li>
                    <li> From now on, CheatCode will automatically propose solutions to coding tasks on right window</li>
                  </ul>
                </QuestionCardContent>
              </QuestionCard>
              <QuestionCard>
                <QuestionCardHeader>
                  <h3 className="text-lg font-bold text-gray-900">
                    How does CheatCode work?
                  </h3>
                </QuestionCardHeader>
                <QuestionCardContent>
                  <p className="text-gray-600">
                    CheatCode works by analyzing the content from your text editor through screen sharing. For optimal performance, we recommend splitting your screen in half with CheatCode on one side and your coding text editor on the other. This setup allows CheatCode to capture the necessary information and provide real-time recommendations and solutions to assist in your coding projects.</p>
                </QuestionCardContent>
              </QuestionCard>
              <QuestionCard>
                <QuestionCardHeader>
                  <h3 className="text-lg font-bold text-gray-900">
                    How frequently does CheatCode offer suggestions?
                  </h3>
                </QuestionCardHeader>
                <QuestionCardContent>
                  <p className="text-gray-600">
                    CheatCode is designed to observe your screen and detect coding tasks. CheatCode evaluates the screen content every 5 seconds and determines if there is a need to offer a solution. If there is a new coding task in the screen, CheatCode attempts to provide a solution.</p>
                </QuestionCardContent>
              </QuestionCard>
              <QuestionCard>
                <QuestionCardHeader>
                  <h3 className="text-lg font-bold text-gray-900">
                    Should I use CheatCode for sensitive data?
                  </h3>
                </QuestionCardHeader>
                <QuestionCardContent>
                  <p className="text-gray-600">
                    No, CheatCode is not designed for handling sensitive or confidential information. While we prioritize data privacy and security, the tool involves data transmission and processing that may not be suitable for sensitive data. We strongly advise against using CheatCode for such purposes to ensure the security of your proprietary information.</p>
                </QuestionCardContent>
              </QuestionCard>
              <QuestionCard>
                <QuestionCardHeader>
                  <h3 className="text-lg font-bold text-gray-900">
                    How does CheatCode ensure the privacy of my data?
                  </h3>
                </QuestionCardHeader>
                <QuestionCardContent>
                  <p className="text-gray-600">
                    CheatCode processes data on the front end. Only textual information is sent to our backend for generating recommendations, ensuring that no images or visual data are stored or transmitted beyond your machine.</p>
                </QuestionCardContent>
              </QuestionCard>
              <QuestionCard>
                <QuestionCardHeader>
                  <h3 className="text-lg font-bold text-gray-900">
                    Can I use CheatCode for production-level software development?
                  </h3>
                </QuestionCardHeader>
                <QuestionCardContent>
                  <p className="text-gray-600">
                    No, CheatCode is intended for use with non-critical side projects and should not be employed in production environments or with sensitive data.</p>
                </QuestionCardContent>
              </QuestionCard>
              <QuestionCard>
                <QuestionCardHeader>
                  <h3 className="text-lg font-bold text-gray-900">
                    Is my data shared with third parties?
                  </h3>
                </QuestionCardHeader>
                <QuestionCardContent>
                  <p className="text-gray-600">
                    CheatCode utilizes third-party AI APIs for processing data. However, we ensure that only necessary textual data is shared while adhering to strict privacy standards.</p>
                </QuestionCardContent>
              </QuestionCard>
              <QuestionCard>
                <QuestionCardHeader>
                  <h3 className="text-lg font-bold text-gray-900">
                    Are updates made to CheatCode?
                  </h3>
                </QuestionCardHeader>
                <QuestionCardContent>
                  <p className="text-gray-600">
                    Yes, we periodically update CheatCode to enhance its features, improve user experience, and ensure security. We recommend keeping your application up-to-date for the best experience. </p>
                </QuestionCardContent>
              </QuestionCard>
              <QuestionCard>
                <QuestionCardHeader>
                  <h3 className="text-lg font-bold text-gray-900">
                    How can I contact CheatCode for further assistance?</h3>
                </QuestionCardHeader>
                <QuestionCardContent>
                  <p className="text-gray-600">
                    If you have any questions or need further assistance, feel free to contact us at <a href="mailto:CheatCodeai@gmail.com" className="text-blue-600 hover:underline">CheatCodeai@gmail.com</a>. Our team is always ready to help!</p>
                </QuestionCardContent>
              </QuestionCard>
              <QuestionCard>
                <QuestionCardHeader>
                  <h3 className="text-lg font-bold text-gray-900">
                    What are the recommended uses of CheatCode?
                  </h3>
                </QuestionCardHeader>
                <QuestionCardContent>
                  <p className="text-gray-600">
                  The recommended uses of CheatCode are instantly getting trouble shooting help while developing side projects and non-critical applications, debugging errors without having to leave your IDE when working on non-critical applications and side projects, and brainstorming solutions to problems when building non-critical applications and side projects.
                  </p>
                </QuestionCardContent>
              </QuestionCard>
              <QuestionCard>
                <QuestionCardHeader>
                  <h3 className="text-lg font-bold text-gray-900">
                    Can I use CheatCode while I am in a brainstorming, coding collaboration meeting?
                  </h3>
                </QuestionCardHeader>
                <QuestionCardContent>
                  <p className="text-gray-600">
                  Yes, but you must ensure that all meeting participants are aware of how the tool works and have consented to using the tool in the meeting since the tool extracts text from the screen. CheatCode can help you accelerate problem solviong while collaborating on non-critical applications and side projects, but it is important that it is used ethically and with user consent.
                  </p>
                </QuestionCardContent>
              </QuestionCard>
            </div>
          </section>
        </div>}
      <Footer />
    </div>
  )
}
