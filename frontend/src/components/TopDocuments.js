import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFile } from '@fortawesome/free-solid-svg-icons';

import {
  TopDocumentsContainer,
  TopDocumentsTable,
  Button,
  SectionTitle,
  PaginationContainer,
  PaginationList,
  PaginationItem,
  PaginationLink
} from '../styles/StyledComponents';

const TopDocuments = ({ documents, onDocumentClick }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Sort documents by count
  const sortedDocuments = Object.entries(documents)
    .sort(([, a], [, b]) => b.count - a.count);

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedDocuments.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedDocuments.length / itemsPerPage);

  const handlePageChange = (pageNumber, e) => {
    e.preventDefault();
    setCurrentPage(pageNumber);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i);
    }

    return (
      <PaginationContainer>
        <PaginationList>
          {pageNumbers.map(number => (
            <PaginationItem key={number}>
              <PaginationLink
                href="#!"
                onClick={(e) => handlePageChange(number, e)}
                active={currentPage === number}
              >
                {number}
              </PaginationLink>
            </PaginationItem>
          ))}
        </PaginationList>
      </PaginationContainer>
    );
  };

return (
    <TopDocumentsContainer>
        <TopDocumentsTable>
            <thead>
                <tr>
                    <th>Document</th>
                    <th>References</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                {currentItems.map(([document, { count, url }], index) => {
                    const formattedDocument = document.replace('___', ' ').replace('.md', '').replace("Page", "(Page ") + ")";  ;
                    return (
                        <tr key={`doc-${index}`}>
                            <td>
                                <FontAwesomeIcon icon={faFile} style={{ marginRight: '8px' }} />
                                {formattedDocument}
                            </td>
                            <td>{count}</td>
                            <td>
                                <Button
                                    onClick={() => onDocumentClick(document, url)}
                                    aria-label={`View ${document}`}
                                >
                                    View
                                </Button>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </TopDocumentsTable>
        {renderPagination()}
    </TopDocumentsContainer>
);
};

TopDocuments.propTypes = {
  documents: PropTypes.objectOf(
    PropTypes.shape({
      count: PropTypes.number.isRequired,
      url: PropTypes.string.isRequired,
      query: PropTypes.string
    })
  ).isRequired,
  onDocumentClick: PropTypes.func.isRequired
};

export default React.memo(TopDocuments);