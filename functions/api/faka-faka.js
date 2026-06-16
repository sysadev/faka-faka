function buildPrompt(data) {
    const schoolName = 'Northwest University, Kano';
    const currentYear = new Date().getFullYear();

    const frameworks = ['Bootstrap 5', 'Bulma', 'Tailwind CSS', 'Materialize CSS', 'UIKit'];
    const randomFramework = frameworks[Math.floor(Math.random() * frameworks.length)];

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

    Design & Layout Instructions (CRITICAL FOR UNIQUENESS):
    - You MUST use the ${randomFramework} framework via CDN. Do not use any other framework.
    - FORCE STRUCTURAL VARIATION: Randomly choose between a traditional Top Navbar, a Left Sidebar Navigation, or a Floating Navigation menu. 
    - MOBILE RESPONSIVENESS (CRITICAL): The website MUST be fully usable on mobile phones. You MUST include a visible hamburger menu icon for small screens. You MUST include a small inline <script> tag just before the closing </body> tag in the master layout to ensure the hamburger menu actually toggles the navigation visibility.
    - Randomly choose a distinct color scheme: Default Light Mode, Deep Dark Mode, or a vibrant colorful theme.
    - Create ONE master HTML layout string containing the <!DOCTYPE html>, <head>, <nav>, and <footer>.
    - The <nav> MUST be a professional, fully styled, responsive navigation menu (e.g., using proper flexbox/grid layout, nice padding, hover effects). Do NOT just output plain, unstyled buttons.
    - Inside that master layout, put EXACTLY this placeholder where the page content should go: FAKA_FAKA_CONTENT_HERE
    - Prominently feature the student's Email (${data.email}) and Phone (${data.phone}) in the site footer.
    - The copyright year in the footer MUST read ${currentYear}.
    - ${githubText}

    Content Instructions (Generate the INNER HTML ONLY for these 11 pages):
    1. index.html, about.html, resume.html, skills.html, project_1.html, project_2.html, coursework.html, hobbies.html, goals.html, contact.html.
    2. fcc_journey.html: Write an engaging story about completing the "Responsive Web Design" course on freeCodeCamp. Include EXACTLY: <img src='fcc_certificate.jpg' alt='freeCodeCamp Certificate'> and EXACTLY: <a href='FAKA_FAKA_FCC_LINK'>Verify Authentic Certificate on freeCodeCamp</a>.
    - Wherever the profile picture belongs in the content, use EXACTLY: <img src='profile.jpg' alt='${data.name} Profile Picture'>.

    Navigation Link Labeling Rule:
    - When creating the navigation links in the <nav>, use highly professional labels. For example, the link to 'fcc_journey.html' MUST be labeled "freeCodeCamp Certification" or "My Learning Journey", NOT "fcc Journey".

    CRITICAL JSON FORMATTING RULES:
    1. You MUST use SINGLE QUOTES for all HTML attributes (e.g., <div class='container'>).
    2. Return raw JSON. Do NOT wrap in markdown blocks.

    Output STRICTLY in this JSON format:
    {
      "layout": "<!DOCTYPE html><html>...<nav>...</nav><main>FAKA_FAKA_CONTENT_HERE</main><script>/* Hamburger Toggle JS */</script><footer>...</footer></html>",
      "pages": [
        { "filename": "index.html", "content": "<section><h1>Welcome</h1>...</section>" },
        { "filename": "about.html", "content": "<section>...</section>" }
      ]
    }`;
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
                    generationConfig: { responseMimeType: 'application/json' }
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
