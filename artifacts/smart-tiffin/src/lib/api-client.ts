import { setAuthTokenGetter } from "@workspace/api-client-react/custom-fetch";

// The access token is stored in localStorage by the AuthProvider
setAuthTokenGetter(() => {
  return localStorage.getItem("smart_tiffin_access_token");
});
