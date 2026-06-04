let myChart = null;

// Fungsi Integrasi Numerik menggunakan Aturan Simpson 1/3
function simpsonIntegration(f, a, b, n = 2000) {
    if (n % 2 !== 0) n++;
    const h = (b - a) / n;
    let sum = f(a) + f(b);

    for (let i = 1; i < n; i++) {
        const x = a + i * h;
        try {
            const y = f(x);
            if (typeof y === 'number' && !isNaN(y) && isFinite(y)) {
                sum += y * (i % 2 === 0 ? 2 : 4);
            }
        } catch (e) {}
    }
    return (h / 3) * sum;
}

// --- PARSER POLINOMIAL YANG MUDAH DIPAHAMI & BEBAS ERROR NaN ---
function parsePolinomialToAntiderivative(funcStr) {
    // Bersihkan spasi dan normalkan format teks
    let formatStr = funcStr.replace(/\s+/g, '').replace(/-/g, '+-');
    if (formatStr.startsWith('+-')) formatStr = formatStr.substring(1);

    const sukuSuku = formatStr.split('+');
    let latexAntiderivative = "";
    let langkahSubstitusi = { texA: "", texB: "" };

    for (let i = 0; i < sukuSuku.length; i++) {
        let suku = sukuSuku[i];
        if (!suku) continue;

        let tanda = "+";
        if (suku.startsWith('-')) {
            tanda = "-";
            suku = suku.substring(1);
        }

        if (i > 0 || tanda === "-") {
            latexAntiderivative += " " + tanda + " ";
        }

        let koefisien = 1;
        let pangkat = 0;

        // Cek jika mengandung variabel x
        if (suku.includes('x')) {
            let partSuku = suku.split('x');

            // Cari Koefisien
            if (partSuku[0] !== "") {
                if (partSuku[0] === "*") koefisien = 1;
                else koefisien = parseFloat(partSuku[0].replace('*', ''));
            }

            // Cari Pangkat
            if (partSuku[1] && partSuku[1].startsWith('^')) {
                pangkat = parseFloat(partSuku[1].substring(1));
            } else {
                pangkat = 1; // Jika hanya 'x' saja berarti x^1
            }
        } else {
            // Jika hanya angka konstan tanpa x
            koefisien = parseFloat(suku);
            pangkat = 0;
        }

        if (isNaN(koefisien) || isNaN(pangkat)) return null; // Jika bukan polinomial murni, kembalikan null

        // Rumus Dasar Integral: (koefisien / (pangkat + 1)) * x^(pangkat + 1)
        let pangkatBaru = pangkat + 1;
        let koefisienBaru = koefisien / pangkatBaru;

        // Membuat Teks LaTeX Antiderivatif F(x)
        if (koefisienBaru === 1) {
            latexAntiderivative += pangkatBaru === 1 ? `x` : `x^{${pangkatBaru}}`;
        } else {
            // Sederhanakan tampilan pecahan jika bilangan bulat
            if (Number.isInteger(koefisienBaru)) {
                latexAntiderivative += `${koefisienBaru}x^{${pangkatBaru}}`;
            } else {
                latexAntiderivative += `\\frac{${koefisien}}{${pangkatBaru}}x^{${pangkatBaru}}`;
            }
        }
    }

    // Rapikan jika ada x^1 menjadi x saja
    latexAntiderivative = latexAntiderivative.replace(/x\^{1}/g, 'x');
    return latexAntiderivative;
}

function setExample(func, a, b) {
    document.getElementById('functionInput').value = func;
    document.getElementById('lowerLimit').value = a;
    document.getElementById('upperLimit').value = b;
    calculateIntegral();
}

function calculateIntegral() {
    const funcStr = document.getElementById('functionInput').value;
    const a = parseFloat(document.getElementById('lowerLimit').value);
    const b = parseFloat(document.getElementById('upperLimit').value);
    const errorDiv = document.getElementById('errorMessage');
    const analError = document.getElementById('analiticalError');

    errorDiv.classList.add('hidden');
    analError.classList.add('hidden');

    document.getElementById('mathFormula').innerHTML = '';
    document.getElementById('antiderivativeFormula').innerHTML = '';
    document.getElementById('substitutionFormula').innerHTML = '';

    if (!funcStr) {
        showError("Mohon masukkan fungsi matematika.");
        return;
    }
    if (isNaN(a) || isNaN(b)) {
        showError("Mohon masukkan batas bawah dan batas atas yang valid (angka).");
        return;
    }

    try {
        // Compile fungsi menggunakan math.js untuk kebutuhan perhitungan grafik & numerik
        const node = math.parse(funcStr.toLowerCase());
        const code = node.compile();

        const f = (x) => {
            const result = code.evaluate({ x: x });
            if (typeof result !== 'number' || isNaN(result)) {
                throw new Error();
            }
            return result;
        };

        // Uji validitas fungsi pada titik tengah rentang
        try { f((a + b) / 2); } catch (e) {
            showError("Fungsi tidak valid atau tidak terdefinisi pada rentang ini.");
            return;
        }

        // --- 1. Hitung Nilai Integral Numerik (Hasil Akhir Akurat) ---
        const resultNumerical = simpsonIntegration(f, a, b);
        document.getElementById('resultValue').innerText = resultNumerical.toFixed(5);

        // --- 2. Langkah 1: Tampilkan Masalah Integral ---
        const latexFunc = node.toTex({ parenthesis: 'keep' });
        const texOriginal = `\\int_{${a}}^{${b}} \\left( ${latexFunc} \\right) \\, dx`;
        katex.render(texOriginal, document.getElementById('mathFormula'), { displayMode: true, throwOnError: false });

        // --- 3. Langkah 2: Antiderivatif Baru ---
        const antiderivativeTex = parsePolinomialToAntiderivative(funcStr);

        if (antiderivativeTex) {
            const texAntiderivative = `\\left[ ${antiderivativeTex} \\right]_{${a}}^{${b}}`;
            katex.render(texAntiderivative, document.getElementById('antiderivativeFormula'), { displayMode: true, throwOnError: false });

            // --- 4. Langkah 3: Substitusi Batas Nyata F(b) - F(a) ---
            // Kita hitung nilai aslinya secara presisi
            const valFaNumerical = simpsonIntegration(f, 0, a);
            const valFbNumerical = simpsonIntegration(f, 0, b);

            // Format teks langkah substitusi agar mudah dibaca pengguna: [Nilai F(b)] - [Nilai F(a)] = Hasil Akhir
            const texSubstitution = `\\left( F(${b}) \\right) - \\left( F(${a}) \\right) =  \\left[ ${valFbNumerical.toFixed(4)} \\right] - \\left[ ${valFaNumerical.toFixed(4)} \\right] = ${resultNumerical.toFixed(4)}`;
            katex.render(texSubstitution, document.getElementById('substitutionFormula'), { displayMode: true, throwOnError: false });

        } else {
            // Jika input berisi fungsi non-polinomial kompleks seperti sin(x)/x, alihkan ke info fallback
            document.getElementById('antiderivativeFormula').innerText = 'N/A';
            document.getElementById('substitutionFormula').innerText = 'N/A';
            analError.classList.remove('hidden');
        }

        // --- 5. Gambar Ulang Grafik ---
        drawChart(f, a, b);

    } catch (error) {
        showError("Kesalahan pada fungsi: Pastikan penulisan matematika benar. (Contoh: x^2 - 2*x + 5)");
    }
}

function showError(msg) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.innerText = msg;
    errorDiv.classList.remove('hidden');
}

function drawChart(f, a, b) {
    const ctx = document.getElementById('integralChart').getContext('2d');
    if (myChart) myChart.destroy();

    const rangeX = Math.abs(b - a);
    const margin = Math.max(rangeX * 0.4, 2);
    const xMin = a - margin;
    const xMax = b + margin;
    const points = 300;
    const step = (xMax - xMin) / points;

    const labels = [];
    const dataLine = [];
    const dataFill = [];

    for (let i = 0; i <= points; i++) {
        const x = xMin + i * step;
        labels.push(x.toFixed(2));
        try {
            const y = f(x);
            dataLine.push(y);
            if (x >= a && x <= b) dataFill.push(y);
            else dataFill.push(null);
        } catch (e) {
            dataLine.push(null);
            dataFill.push(null);
        }
    }

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: 'Area Integral', data: dataFill, fill: true, backgroundColor: 'rgba(59, 130, 246, 0.45)', borderColor: 'transparent', pointRadius: 0, tension: 0.4 },
                { label: 'f(x)', data: dataLine, borderColor: '#1e293b', borderWidth: 2, pointRadius: 0, fill: false, tension: 0.4 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { type: 'category', ticks: { maxTicksLimit: 12 } }
            }
        }
    });
}

window.onload = () => { calculateIntegral(); };