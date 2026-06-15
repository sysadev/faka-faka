function buildPrompt(data) {
    const schoolName = 'Northwest University, Kano';

    const githubText = data.github
        ? `The student's GitHub username is '${data.github}'. Include links to https://github.com/${data.github} in the footer and contact pages.`
        : `The student does not have a GitHub account yet. Do not include GitHub links.`;

    return `You are an expert frontend web developer and technical writer. Generate a completely unique, highly detailed 10-page portfolio website for a university student.

    Student Profile:
    - Name: ${data.name}
    - University: ${schoolName}
    - Academic Level: 200 Level (Second Year Undergraduate)
    - Department: ${data.department}
    - Career Goal: ${data.career}
    - Core Skills: ${data.skills}
    - Hobbies & Interests: ${data.hobbies}

    Design & Image Instructions:
    - Randomly select a modern CSS framework via CDN (e.g., Tailwind CSS, Bootstrap 5, or Bulma) to ensure each generated site looks visually distinct.
    - The student uploaded a profile picture with dimensions: ${data.imageWidth}px width by ${data.imageHeight}px height. Use this aspect ratio to intelligently style the layout around the image.
    - Wherever the profile picture belongs, use EXACTLY this tag: <img src="profile.jpg" alt="${data.name}'s Profile Picture">.
    - ${githubText}

    Content Instructions:
    - Using their department, skills, and hobbies, INVENT a realistic, professional, and engaging backstory that includes their experience studying at ${schoolName}.
    - Invent 2 realistic beginner/intermediate academic projects related to their skills (${data.skills}) that a 200-level student would have completed.
    - Generate lengthy, highly detailed text for all 10 pages. DO NOT use placeholder text (lorem ipsum).
    - Required Pages: index.html, about.html, resume.html, contact.html, skills.html, project_1.html, project_2.html, awards.html, coursework.html, goals.html.

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
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        responseMimeType: 'application/json'
                    }
                })
            }
        );

        const aiData = await aiResponse.json();

        if (!aiData.candidates || aiData.candidates.length === 0) {
            console.error('Gemini API Error Payload:', JSON.stringify(aiData));
            throw new Error('Faka-Faka failed to generate the site layout. Please try again: ' + JSON.stringify(aiData));
        }

        const generatedContent = aiData.candidates[0].content.parts[0].text;
        const generatedJSON = JSON.parse(generatedContent);

        await env.RATE_LIMITER.put(limitKey, (currentUsage + 1).toString(), { expirationTtl: 86400 });

        return new Response(JSON.stringify(generatedJSON), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
