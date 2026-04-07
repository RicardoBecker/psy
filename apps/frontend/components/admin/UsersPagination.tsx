// 📄 Componente de paginação para listagem de usuários
import React from 'react';

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface UsersPaginationProps {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export const UsersPagination: React.FC<UsersPaginationProps> = ({
  pagination,
  onPageChange,
  onLimitChange,
}) => {
  const { total, page, limit, pages } = pagination;
  
  // Calcular range dos itens visíveis
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  // Gerar números das páginas visíveis
  const getVisiblePages = () => {
    const visiblePages: number[] = [];
    const totalPages = pages;
    
    if (totalPages <= 5) {
      // Se há 5 ou menos páginas, mostrar todas
      for (let i = 1; i <= totalPages; i++) {
        visiblePages.push(i);
      }
    } else {
      // Lógica para mais de 5 páginas
      if (page <= 3) {
        // Início: 1, 2, 3, 4, 5
        visiblePages.push(1, 2, 3, 4, 5);
      } else if (page >= totalPages - 2) {
        // Final: ..., n-4, n-3, n-2, n-1, n
        for (let i = totalPages - 4; i <= totalPages; i++) {
          visiblePages.push(i);
        }
      } else {
        // Meio: ..., page-2, page-1, page, page+1, page+2
        for (let i = page - 2; i <= page + 2; i++) {
          visiblePages.push(i);
        }
      }
    }
    
    return visiblePages;
  };

  const visiblePages = getVisiblePages();

  return (
    <div className="bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
      {/* Informações dos itens visíveis */}
      <div className="flex items-center text-sm text-gray-700">
        <span className="mr-2">
          Mostrando {startItem} - {endItem} de {total} usuários
        </span>
        
        {/* Seletor de itens por página */}
        <div className="ml-4 flex items-center">
          <label htmlFor="limit-select" className="mr-2">
            Itens por página:
          </label>
          <select
            id="limit-select"
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Controles de navegação */}
      <div className="flex items-center space-x-1">
        {/* Ir para primeira página */}
        <button
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          className={`p-2 rounded ${
            page === 1
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
          title="Primeira página"
        >
          ⏮️
        </button>

        {/* Página anterior */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className={`p-2 rounded ${
            page === 1
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
          title="Página anterior"
        >
          ◀️
        </button>

        {/* Números das páginas */}
        <div className="flex items-center space-x-1">
          {/* Reticências iniciais */}
          {visiblePages[0] > 1 && (
            <>
              {visiblePages[0] > 2 && (
                <span className="px-2 py-1 text-gray-400">...</span>
              )}
            </>
          )}

          {/* Páginas visíveis */}
          {visiblePages.map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`w-8 h-8 rounded text-sm font-medium ${
                pageNum === page
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {pageNum}
            </button>
          ))}

          {/* Reticências finais */}
          {visiblePages[visiblePages.length - 1] < pages && (
            <>
              {visiblePages[visiblePages.length - 1] < pages - 1 && (
                <span className="px-2 py-1 text-gray-400">...</span>
              )}
            </>
          )}
        </div>

        {/* Próxima página */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === pages}
          className={`p-2 rounded ${
            page === pages
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
          title="Próxima página"
        >
          ▶️
        </button>

        {/* Ir para última página */}
        <button
          onClick={() => onPageChange(pages)}
          disabled={page === pages}
          className={`p-2 rounded ${
            page === pages
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
          title="Última página"
        >
          ⏭️
        </button>
      </div>
    </div>
  );
};