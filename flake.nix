{
  description = "Gentle Walk - Hyperlocal walking planner for pollution-sensitive elderly people";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            jdk21
            maven
            nodejs
            awscli2
            skopeo
          ];

          shellHook = ''
            export JAVA_HOME=${pkgs.jdk21}
            export AWS_PROFILE=AdministratorAccess-651694719691
            export AWS_DEFAULT_REGION=ap-south-1
            export AWS_REGION=ap-south-1
            echo "Gentle Walk dev environment loaded: Java 21, Maven, Node.js, AWS CLI (ap-south-1)"
          '';
        };
      });
}
