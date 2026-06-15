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
    if (statusText) statusText.innerText = "Ana shirya bayanan ku...";

    try {
        const formData = new FormData(form);

        const name = formData.get('name');
        const department = formData.get('department');
        const career = formData.get('career');
        const github = formData.get('github') || "";

        const skillsArray = formData.getAll('skills[]');
        const skillsString = skillsArray.join(', ');

        const hobbiesArray = formData.getAll('hobbies[]');
        const hobbiesString = hobbiesArray.join(', ');

        const profileImageFile = formData.get('picture');
        const dimensions = await getImageDimensions(profileImageFile);

        const payload = {
            name: name,
            department: department,
            career: career,
            skills: skillsString,
            hobbies: hobbiesString,
            github: github,
            imageWidth: dimensions.width,
            imageHeight: dimensions.height
        };

        if (statusText) statusText.innerText = "Ana ƙirƙirar shafin ku... (Ku ɗan jira)";

        const response = await fetch('/api/faka-faka', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        if (statusText) statusText.innerText = "Ana tattara shafukan portfolio ɗinku...";

        if (typeof JSZip === 'undefined') {
            throw new Error("JSZip library is not loaded in the HTML.");
        }

        const zip = new JSZip();
        if (data.files && Array.isArray(data.files)) {
            data.files.forEach(file => {
                zip.file(file.filename, file.content);
            });
        } else {
            throw new Error("API did not return the expected file structure.");
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

        if (statusText) statusText.innerText = "Komai ya kammala! Ku duba cikin downloads folder ɗinku.";
    } catch (err) {
        if (statusText) statusText.innerText = "An samu wata matsala: " + err.message;
        console.error("Portfolio Generation Error:", err);
    } finally {
        submitBtn.disabled = false;
    }
}
