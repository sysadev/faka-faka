function buildPrompt(data) {
    const schoolName = 'Northwest University, Kano';

    const githubText = data.github
        ? `The student's GitHub username is '${data.github}'. Include links to https://github.com/${data.github} in the footer and contact page.`
        : `The student does not have a GitHub account yet. Do not include GitHub links.`;

    return `You are an expert frontend web developer. Generate a completely unique, highly detailed 11-page portfolio website for a university student.

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

    Design Instructions:
    - Randomly select a modern CSS framework via CDN (e.g., Tailwind CSS, Bootstrap 5, Bulma) to ensure the site looks visually distinct. Use the same framework across all 11 pages.
    - The student uploaded a profile picture: ${data.imageWidth}px width by ${data.imageHeight}px height.
    - Wherever the profile picture belongs, use EXACTLY this tag: <img src='profile.jpg' alt='${data.name} Profile Picture'>.
    - Prominently feature the student's Email (${data.email}) and Phone (${data.phone}) in the site footer and on the contact.html page.
    - ${githubText}

    Content & Page Instructions (Generate EXACTLY these 11 pages):
    1. index.html, about.html, resume.html, skills.html, project_1.html, project_2.html, coursework.html, hobbies.html, goals.html, contact.html.
    2. fcc_journey.html: Write an engaging story about their experience completing the "Responsive Web Design" course on freeCodeCamp.
       - You MUST include a placeholder image for their certificate using EXACTLY this tag: <img src='fcc_certificate.jpg' alt='freeCodeCamp Certificate'>.
       - You MUST include a hyperlink for certificate verification using EXACTLY this href placeholder: <a href='FAKA_FAKA_FCC_LINK'>Verify Authentic Certificate on freeCodeCamp</a>.
       - Style both the image and the link beautifully using your chosen CSS framework.

    CRITICAL JSON FORMATTING RULES:
    1. You MUST use SINGLE QUOTES for all HTML attributes (e.g., <div class='container'>). Do NOT use double quotes inside the HTML string.
    2. Do NOT wrap your response in markdown code blocks. Return ONLY the raw JSON object.

    Output:
    Respond STRICTLY with a JSON object exactly in this format:
    { "files": [ { "filename": "index.html", "content": "<!DOCTYPE html>..." } ] }`;
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
                    contents: [{ parts: [{ text: prompt }] }]
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
