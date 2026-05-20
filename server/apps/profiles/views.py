from rest_framework.response import Response
from rest_framework.views import APIView

from .models import UserHealthData
from .serializers import ProfileSerializer, UserHealthDataSerializer


class ProfileView(APIView):
    def get(self, request):
        serializer = ProfileSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        serializer = ProfileSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ProfileHealthView(APIView):
    def get_health_data(self, user):
        health_data, _ = UserHealthData.objects.get_or_create(user=user)
        return health_data

    def get(self, request):
        serializer = UserHealthDataSerializer(self.get_health_data(request.user))
        return Response(serializer.data)

    def put(self, request):
        health_data = self.get_health_data(request.user)
        serializer = UserHealthDataSerializer(health_data, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
