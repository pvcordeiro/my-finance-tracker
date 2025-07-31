document.getElementById('loginForm').addEventListener('submit', async function(e)
{
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    if (res.ok)
        window.location.href = '/index.html';
    else
	{
        document.getElementById('loginError').textContent = 'Invalid credentials.';
        document.getElementById('loginError').style.display = 'block';
    }
});
