(function() {
  'use strict';

  function getInitialLang() {
    var savedLang = localStorage.getItem('flexpaste_lang');
    if (savedLang === 'ja' || savedLang === 'en') {
      return savedLang;
    }
    var navLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
    if (navLang.indexOf('ja') === 0) {
      return 'ja';
    }
    return 'en';
  }

  function setLanguage(lang) {
    if (lang !== 'ja' && lang !== 'en') {
      lang = 'en';
    }
    localStorage.setItem('flexpaste_lang', lang);
    document.documentElement.lang = lang;

    var jaElements = document.querySelectorAll('.lang-ja');
    var enElements = document.querySelectorAll('.lang-en');

    if (lang === 'ja') {
      jaElements.forEach(function(el) { el.style.display = ''; });
      enElements.forEach(function(el) { el.style.display = 'none'; });
    } else {
      jaElements.forEach(function(el) { el.style.display = 'none'; });
      enElements.forEach(function(el) { el.style.display = ''; });
    }

    var btnJa = document.querySelectorAll('.btn-lang-ja');
    var btnEn = document.querySelectorAll('.btn-lang-en');

    btnJa.forEach(function(b) {
      if (lang === 'ja') b.classList.add('active');
      else b.classList.remove('active');
    });

    btnEn.forEach(function(b) {
      if (lang === 'en') b.classList.add('active');
      else b.classList.remove('active');
    });
  }

  document.addEventListener('DOMContentLoaded', function() {
    var currentLang = getInitialLang();
    setLanguage(currentLang);

    document.querySelectorAll('.btn-lang-ja').forEach(function(btn) {
      btn.addEventListener('click', function() { setLanguage('ja'); });
    });
    document.querySelectorAll('.btn-lang-en').forEach(function(btn) {
      btn.addEventListener('click', function() { setLanguage('en'); });
    });
  });
})();
