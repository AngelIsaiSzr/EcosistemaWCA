import { useState } from "react";
import { Helmet } from "react-helmet";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import CodeEditor from "@/components/ui/code-editor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Play, Download, Copy, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

type LanguageType = "html" | "css" | "javascript";

interface EditorContent {
  html: string;
  css: string;
  javascript: string;
}

export default function EditorPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<LanguageType>("html");
  const [editorContent, setEditorContent] = useState<EditorContent>({
    html: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mi Proyecto</title>
</head>
<body>
  <h1>¡Hola, Ecosistema WCA!</h1>
  <p>Este es mi primer proyecto.</p>
  
  <!-- Tu código HTML aquí -->
  
</body>
</html>`,
    css: `/* Estilos CSS */
body {
  font-family: 'Arial', sans-serif;
  line-height: 1.6;
  color: #333;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  color: #0B84FF;
}

/* Tus estilos CSS aquí */
`,
    javascript: `// JavaScript
document.addEventListener('DOMContentLoaded', function() {
  console.log('¡El documento está listo!');
  
  // Tu código JavaScript aquí
  
});
`
  });

  const [outputContent, setOutputContent] = useState<string>("");
  
  const handleEditorChange = (value: string) => {
    setEditorContent({
      ...editorContent,
      [activeTab]: value
    });
  };
  
  const handleRunCode = () => {
    const htmlWithStyles = `
      ${editorContent.html.replace('</head>', `<style>${editorContent.css}</style></head>`)}
      <script>${editorContent.javascript}</script>
    `;
    setOutputContent(htmlWithStyles);
    toast({
      title: "Código ejecutado",
      description: "Tu código se ha ejecutado correctamente.",
    });
  };
  
  const handleSaveCode = () => {
    // Logic to save code to user account would go here
    toast({
      title: "Código guardado",
      description: "Tu código se ha guardado correctamente.",
    });
  };
  
  const handleDownloadCode = () => {
    const htmlWithStylesAndScripts = `
      ${editorContent.html.replace('</head>', `<style>${editorContent.css}</style></head>`)}
      <script>${editorContent.javascript}</script>
    `;
    const blob = new Blob([htmlWithStylesAndScripts], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ecosistema-wca-project.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Código descargado",
      description: "Tu código se ha descargado como un archivo HTML.",
    });
  };
  
  const handleCopyCode = () => {
    const codeToCopy = editorContent[activeTab];
    navigator.clipboard.writeText(codeToCopy);
    toast({
      title: "Código copiado",
      description: `El código ${activeTab.toUpperCase()} se ha copiado al portapapeles.`,
    });
  };

  return (
    <>
      <Helmet>
        <title>Editor de Código - Ecosistema WCA</title>
        <meta 
          name="description" 
          content="Editor de código en línea de Ecosistema WCA. Practica HTML, CSS y JavaScript con nuestro editor interactivo."
        />
      </Helmet>
      
      <div className="flex flex-col min-h-screen">
        <Navbar />
        
        <main className="flex-grow bg-primary-800 pt-16">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-heading font-bold mb-2">
                  Editor de Código
                </h1>
                <p className="text-muted max-w-2xl">
                  Practica y experimenta con HTML, CSS y JavaScript en nuestro editor interactivo. Escribe tu código, ejecútalo y ve los resultados al instante.
                </p>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
                <Button 
                  className="bg-accent-blue hover:bg-accent-blue hover:opacity-90"
                  onClick={handleRunCode}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Ejecutar
                </Button>
                
                <Button 
                  className="bg-accent-blue hover:bg-accent-blue hover:opacity-90"
                  onClick={handleSaveCode}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Guardar
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={handleDownloadCode}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={handleCopyCode}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Editor Section */}
              <div className="bg-primary-700 rounded-xl overflow-hidden">
                <Tabs defaultValue="html" value={activeTab} onValueChange={(value) => setActiveTab(value as LanguageType)}>
                  <div className="bg-primary-900 px-4 py-2">
                    <TabsList className="grid grid-cols-3">
                      <TabsTrigger value="html">HTML</TabsTrigger>
                      <TabsTrigger value="css">CSS</TabsTrigger>
                      <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                    </TabsList>
                  </div>
                  
                  <TabsContent value="html" className="m-0">
                    <CodeEditor 
                      language="html"
                      value={editorContent.html}
                      onChange={handleEditorChange}
                    />
                  </TabsContent>
                  
                  <TabsContent value="css" className="m-0">
                    <CodeEditor 
                      language="css"
                      value={editorContent.css}
                      onChange={handleEditorChange}
                    />
                  </TabsContent>
                  
                  <TabsContent value="javascript" className="m-0">
                    <CodeEditor 
                      language="javascript"
                      value={editorContent.javascript}
                      onChange={handleEditorChange}
                    />
                  </TabsContent>
                </Tabs>
              </div>
              
              {/* Output Section */}
              <div className="bg-white rounded-xl overflow-hidden">
                <div className="bg-primary-900 px-4 py-3 flex justify-between items-center">
                  <p className="text-sm font-medium">Resultado</p>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleRunCode}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Ejecutar
                  </Button>
                </div>
                
                {outputContent ? (
                  <iframe
                    srcDoc={outputContent}
                    title="Output"
                    className="w-full h-[496px] border-0"
                    sandbox="allow-scripts"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-[452px] p-[20px] text-black">
                    <i className="fas fa-code text-4xl mb-4 text-gray-400"></i>
                    <p className="text-lg font-medium text-gray-700 text-center">Haz clic en "Ejecutar" para ver el resultado</p>
                    <p className="text-sm text-gray-500 max-w-sm text-center mt-2">
                      Escribe tu código HTML, CSS y JavaScript y presiona el botón ejecutar para ver tu código en acción.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
}
