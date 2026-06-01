const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

function activate(context) {
    let disposable = vscode.commands.registerCommand('generador-multiclase.crear', async function () {
        // 1. Datos generales (Padre)
        const clasePadre = await vscode.window.showInputBox({ prompt: 'Nombre Clase Padre' });
        const attrPadre = await vscode.window.showInputBox({ prompt: 'Atributo Clase Padre' });
        const cantidadHijas = await vscode.window.showInputBox({ prompt: '¿Cuántas clases hijas deseas?' });

        if (!clasePadre || !attrPadre || !cantidadHijas) return;

        const carpetaTrabajo = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const capP = attrPadre.charAt(0).toUpperCase() + attrPadre.slice(1);

        // 2. Generar Padre (.mjs)
        const contenidoPadre = `export class ${clasePadre} {
    set${capP}(v) { this.${attrPadre.toLowerCase()} = v; }
    get${capP}() { return this.${attrPadre.toLowerCase()}; }
}`;
        fs.writeFileSync(path.join(carpetaTrabajo, `${clasePadre}.mjs`), contenidoPadre, 'utf8');

        // 3. Variables para ir armando el app.mjs
        let importsApp = `import express from 'express';\nimport { ${clasePadre} } from './${clasePadre}.mjs';\n`;
        let instanciasApp = `const app = express();\n\n`;
        let htmlSalida = ``; // <--- Aquí guardaremos el HTML dinámico

        // 4. Bucle para clases hijas
        for (let i = 0; i < parseInt(cantidadHijas); i++) {
            const nombreHija = await vscode.window.showInputBox({ prompt: `Nombre Clase Hija #${i + 1}` });
            const attrHija = await vscode.window.showInputBox({ prompt: `Atributo para ${nombreHija}` });
            
            const tipoDato = await vscode.window.showQuickPick(['string', 'boolean', 'number'], { 
                placeHolder: `Tipo de dato para el atributo de ${nombreHija}` 
            });

            if (!nombreHija || !attrHija || !tipoDato) continue;

            const capH = attrHija.charAt(0).toUpperCase() + attrHija.slice(1);
            
            // Crear archivo hija
            const contenidoHija = `import { ${clasePadre} } from './${clasePadre}.mjs';
export class ${nombreHija} extends ${clasePadre} {
    set${capH}(v) { this.${attrHija.toLowerCase()} = v; }
    get${capH}() { return this.${attrHija.toLowerCase()}; }
}`;
            fs.writeFileSync(path.join(carpetaTrabajo, `${nombreHija}.mjs`), contenidoHija, 'utf8');

            // Preparar instancias en app.mjs
            const valorPrueba = tipoDato === 'string' ? '"Valor"' : tipoDato === 'boolean' ? 'true' : '0';
            importsApp += `import { ${nombreHija} } from './${nombreHija}.mjs';\n`;
            
            instanciasApp += `const p${i} = new ${nombreHija}();\n`;
            instanciasApp += `p${i}.set${capP}("Padre_${clasePadre}");\n`;
            instanciasApp += `p${i}.set${capH}(${valorPrueba});\n\n`;

            // Construir el HTML inyectando los getters de cada instancia
            htmlSalida += `<h1>Objeto ${nombreHija} -> ${attrPadre}: \${p${i}.get${capP}()}, ${attrHija}: \${p${i}.get${capH}()}</h1>`;
        }

        // 5. Generar app.mjs con el HTML final
        const contenidoApp = `${importsApp}
${instanciasApp}
app.get('/', (req, res) => {
    res.send(\`${htmlSalida}\`);
});

app.listen(3000, () => console.log('Servidor en http://localhost:3000'));`;

        fs.writeFileSync(path.join(carpetaTrabajo, 'app.mjs'), contenidoApp, 'utf8');
        vscode.window.showInformationMessage('¡Estructura con HTML dinámico generada!');
    });

    context.subscriptions.push(disposable);
}

module.exports = { activate };