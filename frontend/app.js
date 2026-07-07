// Loader: execute the dashboard script stored in the template tag (#main-script)
(function(){
  const tpl = document.getElementById('main-script');
  if(!tpl){console.warn('No inline dashboard script found.');return}
  try{
    const s = document.createElement('script');
    s.type = 'text/javascript';
    s.textContent = tpl.textContent;
    document.body.appendChild(s);
  }catch(err){
    console.error('Failed to execute dashboard script:', err);
  }
})();
