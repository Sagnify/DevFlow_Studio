const mock = (() => {
  const KEY = "devflow_projects";
  const getAll = () => JSON.parse(localStorage.getItem(KEY) || "[]");
  const setAll = (d) => localStorage.setItem(KEY, JSON.stringify(d));

  return {
    pickFolder: async () => "browser",
    listProjects: () => getAll().sort((a, b) => (b.lastOpened || 0) - (a.lastOpened || 0)),
    createProject: (name, folderPath) => {
      const list = getAll();
      const proj = { name, path: folderPath + "/" + name, lastOpened: Date.now(), graph: { nodes: [], edges: [] } };
      list.push(proj);
      setAll(list);
      return proj;
    },
    openProject: (projectPath) => {
      const list = getAll();
      const idx = list.findIndex((p) => p.path === projectPath);
      if (idx !== -1) { list[idx].lastOpened = Date.now(); setAll(list); }
      return list[idx]?.graph || { nodes: [], edges: [] };
    },
    saveGraph: (projectPath, data) => {
      const list = getAll();
      const idx = list.findIndex((p) => p.path === projectPath);
      if (idx !== -1) { list[idx].graph = data; setAll(list); }
    },
    createFile: () => console.log("createFile: not available in browser"),
    pathExists: () => true,
    deleteProject: (projectPath) => {
      const list = getAll();
      setAll(list.filter((p) => p.path !== projectPath));
    },
    saveProjectType: () => {},
  };
})();

export const api = window.electronAPI || mock;
