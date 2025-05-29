
  // Data stores using localStorage keys
  const BOOKS_KEY = 'library_books';
  const MEMBERS_KEY = 'library_members';
  const ISSUED_KEY = 'library_issued';

  // Helper: Save to localStorage
  function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // Helper: Load from localStorage
  function loadData(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  // Helper: Generate unique id
  function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
  }

  // Show message
  function showMessage(text, type='success') {
    const container = document.getElementById('message-container');
    container.innerHTML = '';
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.textContent = text;
    container.appendChild(div);
    setTimeout(() => { container.innerHTML = ''; }, 4000);
  }

  // Clear form inputs helper
  function clearForm(form) {
    form.reset();
    // remove hidden id inputs if present
    const idField = form.querySelector('input[type="hidden"]');
    if (idField) idField.value = '';
  }

  // TAB handling
  document.querySelectorAll("nav.tabs button").forEach(button => {
    button.addEventListener('click', () => {
      // Deactivate all tabs and contents
      document.querySelectorAll("nav.tabs button").forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
      });
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      // Activate selected tab and content
      button.classList.add('active');
      button.setAttribute('aria-selected', 'true');
      const panelId = button.getAttribute('aria-controls');
      document.getElementById(panelId).classList.add('active');
    });
  });

  /* -------- BOOKS MANAGEMENT -------- */
  const bookForm = document.getElementById('book-form');
  const bookSubmitBtn = document.getElementById('book-submit-btn');
  const bookCancelBtn = document.getElementById('book-cancel-btn');
  let books = loadData(BOOKS_KEY);

  function renderBooks(filter='') {
    const tbody = document.querySelector('#books-table tbody');
    tbody.innerHTML = '';
    const filteredBooks = books.filter(b =>
      b.title.toLowerCase().includes(filter) ||
      b.author.toLowerCase().includes(filter) ||
      b.isbn.toLowerCase().includes(filter));
    if(filteredBooks.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 5;
      td.style.textAlign = 'center';
      td.textContent = 'No books found.';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }
    filteredBooks.forEach(book => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${book.title}</td>
        <td>${book.author}</td>
        <td>${book.isbn}</td>
        <td>${book.published || '-'}</td>
        <td>
          <button class="action-btn" data-id="${book.id}" data-action="edit">Edit</button> |
          <button class="action-btn" data-id="${book.id}" data-action="delete">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function resetBookForm() {
    clearForm(bookForm);
    document.getElementById('book-form-title').textContent = 'Add New Book';
    bookSubmitBtn.textContent = 'Add Book';
    bookCancelBtn.style.display = 'none';
  }

  bookForm.addEventListener('submit', e => {
    e.preventDefault();
    const id = document.getElementById('book-id').value;
    const title = document.getElementById('book-title').value.trim();
    const author = document.getElementById('book-author').value.trim();
    const isbn = document.getElementById('book-isbn').value.trim();
    const published = document.getElementById('book-published').value.trim();

    if(!title || !author || !isbn) {
      showMessage('Please fill in all required book fields.', 'error');
      return;
    }

    // Validate unique ISBN for new book or editing other than itself
    const isbnExists = books.some(b => b.isbn.toLowerCase() === isbn.toLowerCase() && b.id !== id);
    if(isbnExists) {
      showMessage('ISBN must be unique.', 'error');
      return;
    }

    if(id) {
      // Edit book
      const idx = books.findIndex(b => b.id === id);
      if(idx > -1) {
        books[idx] = { id, title, author, isbn, published };
        showMessage('Book updated successfully.');
      }
    } else {
      // Add new book
      const newBook = { id: generateId(), title, author, isbn, published };
      books.push(newBook);
      showMessage('Book added successfully.');
    }

    saveData(BOOKS_KEY, books);
    renderBooks();
    resetBookForm();
    refreshIssueBookOptions();
  });

  // Edit or Delete buttons in book table
  document.querySelector('#books-table tbody').addEventListener('click', e => {
    if(e.target.tagName === 'BUTTON') {
      const id = e.target.dataset.id;
      const action = e.target.dataset.action;
      if(action === 'edit') {
        const book = books.find(b => b.id === id);
        if(book) {
          document.getElementById('book-id').value = book.id;
          document.getElementById('book-title').value = book.title;
          document.getElementById('book-author').value = book.author;
          document.getElementById('book-isbn').value = book.isbn;
          document.getElementById('book-published').value = book.published || '';
          document.getElementById('book-form-title').textContent = 'Edit Book';
          bookSubmitBtn.textContent = 'Update Book';
          bookCancelBtn.style.display = 'inline-block';
          // Switch to Books tab if not active
          if(!document.getElementById('books').classList.contains('active')) {
            document.getElementById('books-tab').click();
          }
        }
      } else if(action === 'delete') {
        if(confirm('Are you sure you want to delete this book?')) {
          // Before delete check if this book is currently issued
          let issuedBooks = loadData(ISSUED_KEY);
          const isIssued = issuedBooks.some(i => i.bookId === id);
          if(isIssued) {
            alert('This book is currently issued and cannot be deleted.');
            return;
          }
          books = books.filter(b => b.id !== id);
          saveData(BOOKS_KEY, books);
          renderBooks();
          refreshIssueBookOptions();
          showMessage('Book deleted successfully.');
          resetBookForm();
        }
      }
    }
  });

  bookCancelBtn.addEventListener('click', e => {
    e.preventDefault();
    resetBookForm();
  });

  document.getElementById('book-search').addEventListener('input', e => {
    renderBooks(e.target.value.toLowerCase());
  });

  /* -------- MEMBERS MANAGEMENT -------- */
  const memberForm = document.getElementById('member-form');
  const memberSubmitBtn = document.getElementById('member-submit-btn');
  const memberCancelBtn = document.getElementById('member-cancel-btn');
  let members = loadData(MEMBERS_KEY);

  function renderMembers(filter='') {
    const tbody = document.querySelector('#members-table tbody');
    tbody.innerHTML = '';
    const filteredMembers = members.filter(m =>
      m.name.toLowerCase().includes(filter) ||
      m.email.toLowerCase().includes(filter));
    if(filteredMembers.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 4;
      td.style.textAlign = 'center';
      td.textContent = 'No members found.';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }
    filteredMembers.forEach(member => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${member.name}</td>
        <td>${member.email}</td>
        <td>${member.phone || '-'}</td>
        <td>
          <button class="action-btn" data-id="${member.id}" data-action="edit">Edit</button> |
          <button class="action-btn" data-id="${member.id}" data-action="delete">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function resetMemberForm() {
    clearForm(memberForm);
    document.getElementById('member-form-title').textContent = 'Add New Member';
    memberSubmitBtn.textContent = 'Add Member';
    memberCancelBtn.style.display = 'none';
  }

  memberForm.addEventListener('submit', e => {
    e.preventDefault();
    const id = document.getElementById('member-id').value;
    const name = document.getElementById('member-name').value.trim();
    const email = document.getElementById('member-email').value.trim();
    const phone = document.getElementById('member-phone').value.trim();

    if(!name || !email) {
      showMessage('Please fill in all required member fields.', 'error');
      return;
    }

    // Validate unique email for new member or editing other than itself
    const emailExists = members.some(m => m.email.toLowerCase() === email.toLowerCase() && m.id !== id);
    if(emailExists) {
      showMessage('Email must be unique.', 'error');
      return;
    }

    if(id) {
      // Edit member
      const idx = members.findIndex(m => m.id === id);
      if(idx > -1) {
        members[idx] = { id, name, email, phone };
        showMessage('Member updated successfully.');
      }
    } else {
      // Add new member
      const newMember = { id: generateId(), name, email, phone };
      members.push(newMember);
      showMessage('Member added successfully.');
    }

    saveData(MEMBERS_KEY, members);
    renderMembers();
    resetMemberForm();
    refreshIssueMemberOptions();
    refreshReturnMemberOptions();
  });

  // Edit or Delete buttons in member table
  document.querySelector('#members-table tbody').addEventListener('click', e => {
    if(e.target.tagName === 'BUTTON') {
      const id = e.target.dataset.id;
      const action = e.target.dataset.action;
      if(action === 'edit') {
        const member = members.find(m => m.id === id);
        if(member) {
          document.getElementById('member-id').value = member.id;
          document.getElementById('member-name').value = member.name;
          document.getElementById('member-email').value = member.email;
          document.getElementById('member-phone').value = member.phone || '';
          document.getElementById('member-form-title').textContent = 'Edit Member';
          memberSubmitBtn.textContent = 'Update Member';
          memberCancelBtn.style.display = 'inline-block';
          // Switch to Members tab if not active
          if(!document.getElementById('members').classList.contains('active')) {
            document.getElementById('members-tab').click();
          }
        }
      } else if(action === 'delete') {
        if(confirm('Are you sure you want to delete this member?')) {
          // Before delete check if this member currently has issued books
          let issuedBooks = loadData(ISSUED_KEY);
          const hasIssuedBooks = issuedBooks.some(i => i.memberId === id);
          if(hasIssuedBooks) {
            alert('This member currently has issued books and cannot be deleted.');
            return;
          }
          members = members.filter(m => m.id !== id);
          saveData(MEMBERS_KEY, members);
          renderMembers();
          showMessage('Member deleted successfully.');
          resetMemberForm();
          refreshIssueMemberOptions();
          refreshReturnMemberOptions();
        }
      }
    }
  });

  memberCancelBtn.addEventListener('click', e => {
    e.preventDefault();
    resetMemberForm();
  });

  document.getElementById('member-search').addEventListener('input', e => {
    renderMembers(e.target.value.toLowerCase());
  });

  /* -------- ISSUE BOOK -------- */
  const issueForm = document.getElementById('issue-form');
  const issueMemberSelect = document.getElementById('issue-member');
  const issueBookSelect = document.getElementById('issue-book');
  let issuedBooks = loadData(ISSUED_KEY);

  function refreshIssueMemberOptions() {
    issueMemberSelect.innerHTML = '<option value="">-- Select Member --</option>';
    members.forEach(m => {
      const option = document.createElement('option');
      option.value = m.id;
      option.textContent = m.name + ' (' + m.email + ')';
      issueMemberSelect.appendChild(option);
    });
  }
  function refreshIssueBookOptions() {
    issueBookSelect.innerHTML = '<option value="">-- Select Book --</option>';
    // Only include books that are NOT currently issued
    const issuedBookIds = new Set(issuedBooks.map(i => i.bookId));
    books.forEach(b => {
      if (!issuedBookIds.has(b.id)) {
        const option = document.createElement('option');
        option.value = b.id;
        option.textContent = b.title + ' (ISBN: ' + b.isbn + ')';
        issueBookSelect.appendChild(option);
      }
    });
  }
  issueForm.addEventListener('submit', e => {
    e.preventDefault();
    const memberId = issueMemberSelect.value;
    const bookId = issueBookSelect.value;
    if(!memberId || !bookId) {
      showMessage('Please select both member and book to issue.', 'error');
      return;
    }
    // Add issue
    const issue = {
      id: generateId(),
      memberId,
      bookId,
      issueDate: (new Date()).toISOString()
    };
    issuedBooks.push(issue);
    saveData(ISSUED_KEY, issuedBooks);
    showMessage('Book issued successfully.');
    issueForm.reset();
    refreshIssueBookOptions();
    refreshReturnMemberOptions();
    renderIssuedBooks();
  });

  /* -------- RETURN BOOK -------- */
  const returnForm = document.getElementById('return-form');
  const returnMemberSelect = document.getElementById('return-member');
  const returnBookSelect = document.getElementById('return-book');
  const returnSubmitBtn = document.getElementById('return-submit-btn');

  function refreshReturnMemberOptions() {
    returnMemberSelect.innerHTML = '<option value="">-- Select Member --</option>';
    // Only members with issued books
    const membersWithIssuedBooks = new Set(issuedBooks.map(i => i.memberId));
    members.forEach(m => {
      if(membersWithIssuedBooks.has(m.id)) {
        const option = document.createElement('option');
        option.value = m.id;
        option.textContent = m.name + ' (' + m.email + ')';
        returnMemberSelect.appendChild(option);
      }
    });
    returnBookSelect.innerHTML = '<option value="">-- Select Book --</option>';
    returnBookSelect.disabled = true;
    returnSubmitBtn.disabled = true;
  }

  returnMemberSelect.addEventListener('change', () => {
    const memberId = returnMemberSelect.value;
    returnBookSelect.innerHTML = '<option value="">-- Select Book --</option>';
    if (!memberId) {
      returnBookSelect.disabled = true;
      returnSubmitBtn.disabled = true;
      return;
    }
    // Get books issued to this member
    const issuedToMember = issuedBooks.filter(i => i.memberId === memberId);
    issuedToMember.forEach(issue => {
      const book = books.find(b => b.id === issue.bookId);
      if(book) {
        const option = document.createElement('option');
        option.value = issue.id; // issue record ID as value to easily remove on return
        option.textContent = book.title + " (ISBN: " + book.isbn + ")";
        returnBookSelect.appendChild(option);
      }
    });
    returnBookSelect.disabled = issuedToMember.length === 0;
    returnSubmitBtn.disabled = issuedToMember.length === 0;
  });

  returnForm.addEventListener('submit', e => {
    e.preventDefault();
    const issueId = returnBookSelect.value;
    if(!issueId) {
      showMessage('Please select a book to return.', 'error');
      return;
    }
    if(confirm('Confirm return of this book?')) {
      issuedBooks = issuedBooks.filter(i => i.id !== issueId);
      saveData(ISSUED_KEY, issuedBooks);
      showMessage('Book returned successfully.');
      returnForm.reset();
      returnBookSelect.disabled = true;
      returnSubmitBtn.disabled = true;
      refreshIssueBookOptions();
      refreshReturnMemberOptions();
      renderIssuedBooks();
    }
  });

  /* -------- ISSUED BOOKS LIST -------- */
  const issuedTableBody = document.querySelector('#issued-table tbody');

  function renderIssuedBooks() {
    issuedTableBody.innerHTML = '';
    if(issuedBooks.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 6;
      td.style.textAlign = 'center';
      td.textContent = 'No books currently issued.';
      tr.appendChild(td);
      issuedTableBody.appendChild(tr);
      return;
    }
    issuedBooks.forEach(issue => {
      const book = books.find(b => b.id === issue.bookId);
      const member = members.find(m => m.id === issue.memberId);
      if(book && member) {
        const tr = document.createElement('tr');
        const issueDate = new Date(issue.issueDate);
        const formattedDate = issueDate.toLocaleDateString() + " " + issueDate.toLocaleTimeString();
        tr.innerHTML = `
          <td>${book.title}</td>
          <td>${book.isbn}</td>
          <td>${member.name}</td>
          <td>${member.email}</td>
          <td>${formattedDate}</td>
          <td><button class="action-btn" data-id="${issue.id}" data-action="return">Return</button></td>
        `;
        issuedTableBody.appendChild(tr);
      }
    });
  }

  // Return button in issued list table
  issuedTableBody.addEventListener('click', e => {
    if(e.target.tagName === 'BUTTON') {
      const issueId = e.target.dataset.id;
      const action = e.target.dataset.action;
      if(action === 'return') {
        if(confirm('Confirm return of this book?')) {
          issuedBooks = issuedBooks.filter(i => i.id !== issueId);
          saveData(ISSUED_KEY, issuedBooks);
          showMessage('Book returned successfully.');
          refreshIssueBookOptions();
          refreshReturnMemberOptions();
          renderIssuedBooks();
          // If on Return tab, reset the form if that issue returned
          if(document.getElementById('return').classList.contains('active')) {
            returnForm.reset();
            returnBookSelect.disabled = true;
            returnSubmitBtn.disabled = true;
          }
        }
      }
    }
  });

  // Initial render and setup
  function initializeApp() {
    renderBooks();
    renderMembers();
    refreshIssueBookOptions();
    refreshIssueMemberOptions();
    refreshReturnMemberOptions();
    renderIssuedBooks();
  }
  initializeApp();