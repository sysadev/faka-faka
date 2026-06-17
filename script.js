function getImageDimensions(file) {
    return new Promise((resolve) => {
        if (!file || file.size === 0) {
            resolve({ width: 0, height: 0 });
            return;
        }

        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = function() {
            URL.revokeObjectURL(objectUrl);
            resolve({ width: img.width, height: img.height });
        };

        img.src = objectUrl;
    });
}

async function faka_faka(event) {
    event.preventDefault();

    const form = event.target;
    const submitBtn = form.querySelector('input[type="submit"]');
    const statusText = document.getElementById('statusText');

    submitBtn.disabled = true;
    if (statusText) statusText.innerText = "Preparing your data...";

    try {
        const formData = new FormData(form);

        const name = formData.get('name');
        const department = formData.get('department');
        const career = formData.get('career');
        const github = formData.get('github') || "";
        const email = formData.get('email');
        const phone = formData.get('phone');

        const skillsString = formData.getAll('skills[]').join(', ');
        const hobbiesString = formData.getAll('hobbies[]').join(', ');

        const profileImageFile = formData.get('picture');
        const dimensions = await getImageDimensions(profileImageFile);

        const payload = {
            name: name,
            department: department,
            career: career,
            email: email,
            phone: phone,
            skills: skillsString,
            hobbies: hobbiesString,
            github: github,
            imageWidth: dimensions.width,
            imageHeight: dimensions.height
        };

        if (statusText) statusText.innerText = "Generating code... (This takes 1-2 minutes)";

        const response = await fetch('/api/faka-faka', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const streamedChunks = await response.json();

        if (streamedChunks.error) {
            throw new Error(streamedChunks.error);
        }

        if (statusText) statusText.innerText = "Packaging files...";

        let combinedText = "";
        streamedChunks.forEach(chunk => {
            if (chunk.candidates && chunk.candidates.length > 0) {
                combinedText += chunk.candidates[0].content.parts[0].text;
            }
        });

        combinedText = combinedText.trim();

        if (combinedText.startsWith('```')) {
            const firstNewline = combinedText.indexOf('\n');
            if (firstNewline !== -1) {
                combinedText = combinedText.substring(firstNewline + 1);
            }
        }
        if (combinedText.endsWith('```')) {
            combinedText = combinedText.substring(0, combinedText.length - 3).trim();
        }

        if (typeof JSZip === 'undefined') {
            throw new Error("JSZip library is not loaded.");
        }

        const zip = new JSZip();

        const styleStartTag = '[FAKA_STYLE]';
        const styleEndTag = '[/FAKA_STYLE]';
        const styleStartIdx = combinedText.indexOf(styleStartTag);
        const styleEndIdx = combinedText.indexOf(styleEndTag);
        if (styleStartIdx !== -1 && styleEndIdx !== -1) {
            const styleCSS = combinedText.substring(styleStartIdx + styleStartTag.length, styleEndIdx).trim();
            zip.file("style.css", styleCSS);
        }

        const scriptStartTag = '[FAKA_SCRIPT]';
        const scriptEndTag = '[/FAKA_SCRIPT]';
        const scriptStartIdx = combinedText.indexOf(scriptStartTag);
        const scriptEndIdx = combinedText.indexOf(scriptEndTag);
        if (scriptStartIdx !== -1 && scriptEndIdx !== -1) {
            const scriptJS = combinedText.substring(scriptStartIdx + scriptStartTag.length, scriptEndIdx).trim();
            zip.file("script.js", scriptJS);
        }

        const layoutStartTag = '[FAKA_LAYOUT]';
        const layoutEndTag = '[/FAKA_LAYOUT]';
        const layoutStartIdx = combinedText.indexOf(layoutStartTag);
        const layoutEndIdx = combinedText.indexOf(layoutEndTag);

        if (layoutStartIdx === -1 || layoutEndIdx === -1) {
            throw new Error("API failed to generate the master layout correctly.");
        }

        const layoutHTML = combinedText.substring(layoutStartIdx + layoutStartTag.length, layoutEndIdx).trim();

        const pageParts = combinedText.split('[FAKA_PAGE:');
        let pagesProcessed = 0;

        for (let i = 1; i < pageParts.length; i++) {
            const part = pageParts[i];
            const closeBracketIdx = part.indexOf(']');

            if (closeBracketIdx > -1) {
                const filename = part.substring(0, closeBracketIdx).trim();
                let content = part.substring(closeBracketIdx + 1);

                content = content.split('[/FAKA_PAGE]')[0].trim();

                const fullHTMLFile = layoutHTML.replace('FAKA_FAKA_CONTENT_HERE', content);

                zip.file(filename, fullHTMLFile);
                pagesProcessed++;
            }
        }

        if (pagesProcessed === 0) {
            throw new Error("API failed to slice the pages correctly.");
        }

        if (profileImageFile && profileImageFile.size > 0) {
            zip.file("profile.jpg", profileImageFile);
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(zipBlob);

        const safeName = name ? name.replace(/\s+/g, '_').toLowerCase() : 'user';
        downloadLink.download = `Portfolio_${safeName}.zip`;
        downloadLink.click();

        if (statusText) statusText.innerText = "Done! Check your downloads.";

        form.reset();
    } catch (err) {
        console.error("Faka-Faka Technical Error:", err);

        if (statusText) {
            const errorMessage = err.message || "";

            if (errorMessage.includes('limit of 3 portfolios')) {
                statusText.innerText = "Daily limit reached (3/day). Come back tomorrow!";
            } else {
                statusText.innerText = "Generation failed. Please try again.";
            }
        }
    } finally {
        submitBtn.disabled = false;
    }
}
