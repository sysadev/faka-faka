function buildPrompt(data) {
    const schoolName = 'Northwest University, Kano';
    const currentYear = new Date().getFullYear();

    const frameworks = ['Bootstrap 5', 'Bulma', 'Tailwind CSS', 'Materialize CSS', 'UIKit'];
    const randomFramework = frameworks[Math.floor(Math.random() * frameworks.length)];

    const githubText = data.github
        ? `The student's GitHub username is '${data.github}'. Include links to https://github.com/${data.github} in the footer and contact page.`
        : `The student does not have a GitHub account yet. Do not include GitHub links.`;

    return `CRITICAL GENERATION RULES - YOU MUST OBEY THESE TO PREVENT ERRORS:
    1. MANDATORY COMPLETION: You MUST generate the Master Layout and ALL 11 INDIVIDUAL PAGES. Do not stop early.
    2. NO EMPTY PAGES: Every single [FAKA_PAGE:filename.html] tag MUST contain actual HTML content inside it. Do not leave any page empty.
    3. CONSERVE TOKENS: Keep the text content inside the HTML pages brief and concise. Use short sentences. Do not write long paragraphs.
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
    - MOBILE RESPONSIVENESS (CRITICAL): You MUST include a visible hamburger menu icon for small screens, and an inline <script> in the master layout to toggle the menu.
    - Create ONE master HTML layout string containing the <!DOCTYPE html>, <head>, <nav>, and <footer>.
    - Inside that master layout, put EXACTLY this placeholder where the page content should go: FAKA_FAKA_CONTENT_HERE
    - The copyright year in the footer MUST read ${currentYear}.
    - ${githubText}

    Content Instructions (Generate INNER HTML ONLY for exactly 11 pages):
    1. index.html, about.html, resume.html, skills.html, project_1.html, project_2.html, coursework.html, hobbies.html, goals.html, contact.html.
    2. fcc_journey.html: Write an engaging story about completing the "Responsive Web Design" course on freeCodeCamp. Include EXACTLY: <img src='fcc_certificate.jpg' alt='freeCodeCamp Certificate'> and EXACTLY: <a href='FAKA_FAKA_FCC_LINK'>Verify Authentic Certificate on freeCodeCamp</a>.
    - Profile picture placeholder MUST be: <img src='profile.jpg' alt='${data.name} Profile Picture'>.
    - The link to 'fcc_journey.html' MUST be labeled "freeCodeCamp Certification" or "My Learning Journey".

    CRITICAL OUTPUT FORMAT (DO NOT USE JSON):
    You must return the generated website as raw text using EXACTLY these custom delimiters. Do not use markdown blocks.

    [FAKA_LAYOUT]
    <!DOCTYPE html>
    <html lang="en">
    <head>...</head>
    <body>
    <nav>...</nav>
    <main>FAKA_FAKA_CONTENT_HERE</main>
    <script>/* Hamburger JS */</script>
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

        const aiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:streamGenerateContent?key=${env.GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { maxOutputTokens: 50000 }
                })
            }
        );

        if (!aiResponse.ok) {
            const errData = await aiResponse.text();
            throw new Error(`Google API Error: ${errData}`);
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
