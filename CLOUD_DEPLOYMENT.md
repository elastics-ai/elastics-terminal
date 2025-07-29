# Cloud Deployment

Elastics is built as a cloud-native trading and research platform, leveraging containerized, scalable infrastructure for secure and low-latency workflows. It supports multi-cloud environments (AWS, GCP, Azure) and can integrate with on-prem or co-located setups for high-frequency or latency-sensitive execution.

## 1. Architecture

The platform is designed around a microservices architecture. Each core component—such as data ingestion, strategy execution, order management, and risk analysis—runs as an independent, containerized service. This design allows for individual scaling, updating, and maintenance of components without impacting the entire system. Docker containers ensure consistency across development, testing, and production environments.

## 2. Security and Data Isolation

Security is paramount. We leverage cloud provider best practices, including:
*   **Network Isolation:** Deploying services within a Virtual Private Cloud (VPC) or Virtual Network (VNet) with strict firewall rules and security groups.
*   **Identity and Access Management (IAM):** Enforcing the principle of least privilege for all services and user access.
*   **Secrets Management:** Using managed services like Azure Key Vault or AWS Secrets Manager to handle API keys, credentials, and other sensitive data.
*   **Data Encryption:** All data is encrypted in transit using TLS and at rest using provider-managed keys.

## 3. Deployment Models

Elastics supports multiple deployment models to fit different needs:
*   **Kubernetes:** For large-scale, production-grade deployments requiring high availability, auto-scaling, and complex orchestration, we recommend using a managed Kubernetes service (AKS, EKS, GKE).
*   **Serverless Containers:** For simpler applications, development environments, or specific tasks, serverless container platforms like Azure Container Instances or AWS Fargate provide a fast and straightforward deployment path. `docker-compose` is particularly well-suited for this model.

## 4. Deploying with Docker Compose

The most direct way to deploy a Docker Compose project is by leveraging a cloud provider's integration with the Docker CLI. Azure Container Instances (ACI) offers a seamless experience, allowing you to deploy a multi-container application directly from your `docker-compose.yml` file.

### Prerequisites

*   Docker Desktop
*   An Azure account and the Azure CLI installed (`az login`)

### Step 1: Push Container Images to a Registry

Your container images must be stored in a registry accessible by Azure. We recommend using Azure Container Registry (ACR).

1.  **Create an ACR instance** if you don't have one.
    ```bash
    az group create --name myResourceGroup --location eastus
    az acr create --resource-group myResourceGroup --name <yourregistryname> --sku Basic
    ```
2.  **Log in to your ACR instance.**
    ```bash
    az acr login --name <yourregistryname>
    ```
3.  **Tag your local images** to point to your ACR. Update your `docker-compose.yml` to reference the registry.
    
    **Example `docker-compose.yml`:**
    ```yaml
    services:
      webapp:
        image: <yourregistryname>.azurecr.io/myapp:latest
        ports:
         - "80:8080"
      redis:
        image: redis:alpine
    ```

    Then build your image with the new tag:
    ```bash
    docker build -t <yourregistryname>.azurecr.io/myapp:latest .
    ```
4.  **Push the images.**
    ```bash
    docker push <yourregistryname>.azurecr.io/myapp:latest
    ```

### Step 2: Create an Azure Docker Context

A Docker context connects your local Docker CLI to your Azure subscription, enabling you to manage ACI resources with `docker` commands.

1.  **Create the ACI context.**
    ```bash
    docker context create aci myacicontext
    ```
2.  **Switch to the new context.**
    ```bash
    docker context use myacicontext
    ```
    You can verify the current context with `docker context ls`.

### Step 3: Deploy with `docker compose`

With the ACI context active, you can deploy your application using the standard `docker compose` command.

1.  **Navigate to your project directory** containing the `docker-compose.yml` file.
2.  **Run the deploy command.**
    ```bash
    docker compose up
    ```
    Docker will translate the `docker-compose.yml` file into an ACI Container Group, pull the specified images from your registry, and start the containers in the cloud.

3.  **Tear down the deployment.** To stop the application and delete all associated ACI resources, run:
    ```bash
    docker compose down
    ```

## 5. Scalability

While `docker-compose` on ACI is excellent for simple deployments, true auto-scaling is better handled by Kubernetes. However, you can achieve basic horizontal scaling by defining the number of replicas for a service directly in cloud-specific compose files or by manually scaling container groups. Vertical scaling is achieved by provisioning container instances with more CPU and memory.

## 6. Monitoring and Observability

Once deployed, you can monitor your application using cloud-native tools.
*   **Logs:** View container logs using `docker logs <container_name>`.
*   **Metrics:** Azure Monitor automatically collects metrics on CPU, memory, and network usage for your container instances.
*   **Observability:** For more advanced monitoring, you can integrate logging drivers to send logs to Azure Log Analytics or configure your application to export metrics to a Prometheus/Grafana stack.
