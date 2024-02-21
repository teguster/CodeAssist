'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { handleJoinOurSlackRequest } from '../../lib/client/utils';

export default function Header() {
    const [isSmallScreen, setIsSmallScreen] = useState(false);

    useEffect(() => {
        // Update isSmallScreen state on window resize
        const handleResize = () => {
            setIsSmallScreen(window.innerWidth < 800); // Adjust the breakpoint as needed
        };

        // Initial check on mount
        handleResize();

        // Add event listener for window resize
        window.addEventListener('resize', handleResize);

        // Clean up the event listener on component unmount
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <header className="flex flex-row justify-between items-center py-3 px-4">
            <a className="text-gray-600" href="/">
                <h1 className="text-2xl font-bold text-gray-900 ">CheatCode</h1>
            </a>
            {isSmallScreen ? (
                <div className="flex items-center space-x-4">
                </div>
            ) : (
                <div className="flex items-center space-x-4">
                    <Link className="text-gray-600 hover:underline" href="/#howToUse">
                        How It Works?
                    </Link>
                    <button className="flex items-center px-4 py-2 text-gray-600 hover:underline" onClick={handleJoinOurSlackRequest}>
                        <img
                            className="w-6 mr-2"
                            src="static/slack-icon-512x511-udpsz3x6.png"
                            alt="Slack Logo"
                            width={844}
                            height={814}
                        >
                        </img>
                        Join Slack Community
                    </button>
                </div>
            )}
        </header>
    );
}
