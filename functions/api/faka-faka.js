function buildPrompt(data) {
    const schoolName = 'Northwest University, Kano';
    const currentYear = new Date().getFullYear();

    const frameworks = ['Bootstrap 5', 'Bulma', 'Tailwind CSS', 'Materialize CSS'];
    const randomFramework = frameworks[Math.floor(Math.random() * frameworks.length)];

    const githubText = data.github
        ? `The student's GitHub username is '${data.github}'. Include links to https://github.com/${data.github} in the footer and contact page.`
        : `The student does not have a GitHub account yet. Do not include GitHub links.`;

    return `CRITICAL GENERATION RULES - YOU MUST OBEY THESE TO PREVENT ERRORS:
    1. MANDATORY COMPLETION: You MUST generate the Master Layout, the Style block, the Script block, and ALL 11 INDIVIDUAL PAGES. Do not stop early.
    2. NO EMPTY PAGES: Every single [FAKA_PAGE:filename.html] tag MUST contain actual HTML content inside it. Do not leave any page empty.
    3. RICH CONTENT: Write professional, engaging, and detailed content for each page. Ensure every page has enough content to look like a real, finished portfolio. Do not use repetitive filler text.
    4. NO MARKDOWN: Do not wrap your response in \`\`\`html or \`\`\` blocks. Output only the raw tags.

    You are an expert frontend web developer. Generate a completely unique, highly detailed 11-page portfolio website for a university student.

    Student Profile:
    - Name: ${data.name}
    - Email: ${data.email}
    - Phone: ${data.phone}
    - University: ${schoolName}
    - Academic Level: 200 Level
    - Department: ${data.department}
    - Career Goal: ${data.career}
    - Core Skills: ${data.skills}
    - Hobbies & Interests: ${data.hobbies}

    Design & Layout Instructions:
    - You MUST use the ${randomFramework} framework via CDN.
    - FORCE STRUCTURAL VARIATION: Randomly choose between a Top Navbar, a Left Sidebar, or a Floating Navigation.
    - MOBILE RESPONSIVENESS & EXTERNAL ASSETS: The layout must be responsive. Do NOT use inline <style> or <script> blocks in the HTML. Include <link rel="stylesheet" href="style.css"> and <script src="script.js" defer></script> inside the <head>.
    - Create ONE master HTML layout string containing the <!DOCTYPE html>, <head>, <nav>, and <footer>.
    - Inside that master layout, put EXACTLY this placeholder where the page content should go: FAKA_FAKA_CONTENT_HERE
    - The copyright year in the footer MUST read ${currentYear}.
    - ${githubText}

    Content Instructions (Generate INNER HTML ONLY for exactly 11 pages):
    1. index.html, about.html, resume.html, skills.html, project_1.html, project_2.html, coursework.html, hobbies.html, goals.html, contact.html.
    2. fcc_journey.html: Write an engaging story about completing the "Responsive Web Design" course on freeCodeCamp. Include EXACTLY: <img src='fcc_certificate.jpg' alt='freeCodeCamp Certificate' onerror='event.target.remove()'> and EXACTLY: <a href='FAKA_FAKA_FCC_LINK'>Verify Authentic Certificate on freeCodeCamp</a>.
    - Profile picture placeholder MUST be: <img src='profile.jpg' alt='${data.name} Profile Picture'>.
    - The link to 'fcc_journey.html' MUST be labeled "freeCodeCamp Certification" or "My Learning Journey".

    CRITICAL OUTPUT FORMAT (DO NOT USE JSON):
    You must return the generated website as raw text using EXACTLY these custom delimiters. Do not use markdown blocks.

    [FAKA_STYLE]
    /* Write all custom CSS for the portfolio here */
    [/FAKA_STYLE]

    [FAKA_SCRIPT]
    /* Write all JavaScript (like hamburger menu logic) here */
    [/FAKA_SCRIPT]

    [FAKA_LAYOUT]
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${data.name} - Portfolio</title>
        <link rel="stylesheet" href="style.css">
        <script src="script.js" defer></script>
        </head>
    <body>
    <nav>...</nav>
    <main>FAKA_FAKA_CONTENT_HERE</main>
    <footer>...</footer>
    </body>
    </html>
    [/FAKA_LAYOUT]

    [FAKA_PAGE:index.html]
    <section>...</section>
    [/FAKA_PAGE]

    [FAKA_PAGE:about.html]
    <section>...</section>
    [/FAKA_PAGE]
    `;
}

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown_ip';
        const limitKey = `ratelimit_${ip}`;

        let currentUsage = await env.RATE_LIMITER.get(limitKey);
        currentUsage = currentUsage ? parseInt(currentUsage) : 0;

        if (currentUsage >= 3) {
            return new Response(JSON.stringify({
                error: 'You have reached your limit of 3 portfolios per day. Please check back tomorrow!'
            }), {
                status: 429,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const payload = await request.json();
        const prompt = buildPrompt(payload);

        const modelsToTry = [
            { name: 'gemini-3.5-flash', maxTokens: 64000 },
            { name: 'gemini-2.5-flash', maxTokens: 64000 }
        ];

        let aiResponse = null;
        let lastErrorData = "";
        let success = false;

        for (const model of modelsToTry) {
            try {
                aiResponse = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model.name}:streamGenerateContent?key=${env.GEMINI_API_KEY}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: prompt }] }],
                            generationConfig: { maxOutputTokens: model.maxTokens }
                        })
                    }
                );

                if (aiResponse.ok) {
                    success = true;
                    break;
                } else {
                    lastErrorData = await aiResponse.text();
                    console.error(`Faka-Faka Backend: ${model.name} failed with error:`, lastErrorData);
                }
            } catch (err) {
                lastErrorData = err.message;
                console.error(`Faka-Faka Backend: ${model.name} network error:`, lastErrorData);
            }
        }

        if (!success) {
            throw new Error(`Google API Error: All stable models failed to respond. Last error: ${lastErrorData}`);
        }

        await env.RATE_LIMITER.put(limitKey, (currentUsage + 1).toString(), { expirationTtl: 86400 });

        return new Response(aiResponse.body, {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
