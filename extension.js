const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

function activate(context) {
    let disposable = vscode.commands.registerCommand('generador-multiclase.crear', async function () {
        const folderPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!folderPath) return vscode.window.showErrorMessage('¡Abre una carpeta primero!');

        // 1. Preguntar por la Clase Padre
        const padreInput = await vscode.window.showInputBox({ 
            prompt: 'Clase Padre (Ej: Vehiculo o Animal)' 
        });
        if (!padreInput) return;

        // 2. Preguntar por las Clases Hijas (Separadas por comas)
        const hijasInput = await vscode.window.showInputBox({ 
            prompt: 'Clases Hijas separadas por comas (Ej: Carro, Moto, Avion)' 
        });
        if (!hijasInput) return;

        // Formatear Clase Padre
        const PClase = padreInput.charAt(0).toUpperCase() + padreInput.slice(1).trim();
        const PArchivo = PClase.toLowerCase();

        // Procesar la lista de clases hijas
        const listaHijas = hijasInput.split(',').map(h => h.trim()).filter(h => h.length > 0);
        if (listaHijas.length === 0) return vscode.window.showErrorMessage('¡Debes escribir al menos una clase hija!');

        // --- GENERAR ARCHIVO PADRE ---
        const codigoPadre = `export class ${PClase} {
    setEspecie(e){this.especie = e;}
    getEspecie(){return this.especie;}
}`;
        fs.writeFileSync(path.join(folderPath, `${PArchivo}.mjs`), codigoPadre);

        // --- GENERAR ARCHIVOS HIJOS Y PREPARAR IMPORTS/LOGICA PARA APP.MJS ---
        let bloquesImports = `import express from 'express';\nimport { ${PClase} } from "./${PArchivo}.mjs";\n`;
        let bloquesInstancias = '';

        listaHijas.forEach((hija, index) => {
            const HClase = hija.charAt(0).toUpperCase() + hija.slice(1);
            const HArchivo = HClase.toLowerCase();

            // Crear el archivo .mjs de esta clase hija específica
            const codigoHijo = `import { ${PClase} } from "./${PArchivo}.mjs";
export class ${HClase} extends ${PClase} {
    setRaza(r){this.raza = r;}
    getRaza(){return this.raza;}
}`;
            fs.writeFileSync(path.join(folderPath, `${HArchivo}.mjs`), codigoHijo);

            // Agregar el import correspondiente para el app.mjs
            bloquesImports += `import { ${HClase} } from "./${HArchivo}.mjs";\n`;

            // Crear la variable y agregarla al HTML que se enviará al navegador
            const varName = `p${index + 1}`;
            bloquesInstancias += `    const ${varName} = new ${HClase}();\n`;
            bloquesInstancias += `    ${varName}.setEspecie("${PClase} / ${HClase}");\n`;
            bloquesInstancias += `    ${varName}.setRaza("Modelo-${HClase}");\n`;
            bloquesInstancias += `    html += \`<p><b>Objeto ${index + 1}:</b> \${${varName}.getEspecie()} de Tipo \${${varName}.getRaza()}</p>\`;\n\n`;
        });

        // --- ARMAR EL ARCHIVO APP.MJS DINÁMICO ---
        const codigoApp = `${bloquesImports}
const app = express();

app.get('/', (req, res) => {
    let html = '<h1>Lista de Objetos en Localhost</h1>';
${bloquesInstancias}    res.send(html);
});

app.listen(3000);`;

        try {
            fs.writeFileSync(path.join(folderPath, 'app.mjs'), codigoApp);
            vscode.window.showInformationMessage(`¡Estructura con ${listaHijas.length} clases hijas creada con éxito!`);
        } catch (e) {
            vscode.window.showErrorMessage('Error: ' + e.message);
        }
    });
    context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = { activate, deactivate };