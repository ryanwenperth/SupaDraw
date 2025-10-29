import { Button } from "@/components/ui/button";
import { GITHUB_REPO_URL } from "@/constants";
import isAuthenticated from "@/hooks/isAuthenticated";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

export default function HomePage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["user", "authenticated"],
    queryFn: () => isAuthenticated(),
  });

  function action(authenticated: boolean) {
    if (authenticated === true) {
      navigate({ to: "/pages" });
    } else {
      navigate({ to: "/login", replace: true });
    }
  }
  return (
    <main className="font-Arial flex h-full w-full flex-col bg-white p-2">
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex h-fit w-full flex-col items-center gap-y-8 sm:w-1/2">
          <h1 className="text-black-500 text-center text-5xl font-medium">
            Autônomo installation work instruction.
          </h1>
          <Button
            isLoading={isLoading}
            loadingText=""
            className="w-2/3 bg-red-500 text-lg font-semibold"
            onClick={() => action(data ? true : false)}
          >
            {data ? "View instructions" : "Sign In"}
          </Button>
        </div>
      </div>
      <footer>
        <div className="flex h-16 w-full items-center justify-center">
          <div className="flex flex-row items-center justify-center align-middle">
            <h1 className="text-lg">
              Presented by{" "}
              <a
                href="https://www.autonomo.net.au/"
                //className="font-semibold underline"
              >
                <span className="text-red-500">
                  <strong>Autônomo</strong>
                </span>
              </a>
            </h1>
          </div>
        </div>
      </footer>
    </main>
  );
}
