document.addEventListener("DOMContentLoaded", function () {
    const dropzone = document.getElementById("dropzone");
    const fileInput = document.getElementById("file-input");
    const preview = document.getElementById("preview");
    const label = document.getElementById("dropzone-label");
    const form = document.getElementById("upload-form");
    const submitBtn = document.getElementById("submit-btn");

    if (!dropzone) return;

    function showPreview(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (e) {
            preview.src = e.target.result;
            preview.style.display = "block";
            label.textContent = file.name;
        };
        reader.readAsDataURL(file);
    }

    fileInput.addEventListener("change", function () {
        showPreview(fileInput.files[0]);
    });

    ["dragenter", "dragover"].forEach(evt => {
        dropzone.addEventListener(evt, function (e) {
            e.preventDefault();
            dropzone.classList.add("dragover");
        });
    });

    ["dragleave", "drop"].forEach(evt => {
        dropzone.addEventListener(evt, function (e) {
            e.preventDefault();
            dropzone.classList.remove("dragover");
        });
    });

    dropzone.addEventListener("drop", function (e) {
        const files = e.dataTransfer.files;
        if (files.length) {
            fileInput.files = files;
            showPreview(files[0]);
        }
    });

    if (form) {
        form.addEventListener("submit", function () {
            submitBtn.disabled = true;
            submitBtn.textContent = "Analyzing...";
        });
    }
});
